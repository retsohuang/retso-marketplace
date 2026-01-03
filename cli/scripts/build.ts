#!/usr/bin/env bun
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { analyzePlugin } from '../src/lib/analyze'
import { PluginManifestSchema } from '../src/types/plugin'
import { validatePlugin } from './validate-plugin'

const ROOT_DIR = resolve(import.meta.dir, '..')
const PLUGINS_DIR = resolve(ROOT_DIR, '..', 'plugins')
const OUTPUT_DIR = join(ROOT_DIR, 'dist/plugins')
const GENERATED_DIR = join(ROOT_DIR, 'src/generated')

interface PluginInfo {
  name: string
  description: string
  version: string
  filename: string
  commandCount: number
  agentCount: number
  skillCount: number
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function buildPluginScripts(): Promise<void> {
  console.log('Step 1: Building plugin scripts...\n')

  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true })
  const pluginDirs = entries.filter((e) => e.isDirectory())

  for (const entry of pluginDirs) {
    const scriptsDir = join(PLUGINS_DIR, entry.name, 'scripts')
    const scriptsPackage = join(scriptsDir, 'package.json')

    if (await exists(scriptsPackage)) {
      console.log(`Building: ${entry.name}/scripts`)

      const proc = Bun.spawn(['bun', 'run', 'build'], {
        cwd: scriptsDir,
        stdout: 'inherit',
        stderr: 'inherit',
      })

      const exitCode = await proc.exited

      if (exitCode !== 0) {
        console.error(`  Build failed for ${entry.name}/scripts`)
        process.exit(1)
      }

      console.log(`  Built: ${entry.name}/scripts\n`)
    }
  }
}

async function analyzePlugins(): Promise<Map<string, boolean>> {
  console.log('Step 2: Analyzing plugin dependencies...\n')

  const installable = new Map<string, boolean>()
  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true })
  const pluginDirs = entries.filter((e) => e.isDirectory())

  for (const entry of pluginDirs) {
    const pluginPath = join(PLUGINS_DIR, entry.name)
    const analysis = await analyzePlugin(pluginPath)

    if (!analysis.installable) {
      console.log(`⚠️  Skipping ${entry.name}`)
      for (const warning of analysis.warnings) {
        console.log(`    • ${warning}`)
      }
      console.log(`    → Convert dependencies to skills before building\n`)
    }

    installable.set(entry.name, analysis.installable)
  }

  return installable
}

async function getPackableItems(pluginPath: string): Promise<string[]> {
  const items: string[] = []

  // plugin.json is required
  if (!(await exists(join(pluginPath, 'plugin.json')))) {
    throw new Error(`plugin.json not found in ${pluginPath}`)
  }
  items.push('plugin.json')

  // Get all entries in plugin directory
  const entries = await readdir(pluginPath, { withFileTypes: true })

  for (const entry of entries) {
    // Skip plugin.json (already handled)
    if (entry.name === 'plugin.json') continue

    // Skip non-installable directories
    if (
      entry.name === 'scripts' ||
      entry.name === 'rules' ||
      entry.name === 'templates' ||
      entry.name === 'node_modules' ||
      entry.name === '.git'
    )
      continue

    // Skip README
    if (entry.name === 'README.md') continue

    // Include installable directories
    if (entry.isDirectory()) {
      if (
        entry.name === 'commands' ||
        entry.name === 'agents' ||
        entry.name === 'skills'
      ) {
        items.push(entry.name)
      }
    }
  }

  return items
}

async function packPlugin(
  pluginPath: string,
  outputDir: string,
): Promise<PluginInfo | null> {
  const validation = await validatePlugin(pluginPath)

  if (!validation.valid) {
    console.log(`  Validation failed: ${validation.message}`)
    return null
  }

  const pluginName = basename(pluginPath)
  const outputPath = join(outputDir, `${pluginName}.plugin`)

  let existingItems: string[]
  try {
    existingItems = await getPackableItems(pluginPath)
  } catch (error) {
    console.log(
      `  Packing failed: ${error instanceof Error ? error.message : error}`,
    )
    return null
  }

  const proc = Bun.spawn(['zip', '-r', outputPath, ...existingItems], {
    cwd: pluginPath,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    console.log(`  ZIP failed: ${stderr}`)
    return null
  }

  if (!validation.name || !validation.description || !validation.version) {
    return null
  }

  // Read manifest to get counts
  let commandCount = 0
  let agentCount = 0
  let skillCount = 0

  try {
    const manifestPath = join(pluginPath, 'plugin.json')
    const manifestContent = await readFile(manifestPath, 'utf-8')
    const manifest = PluginManifestSchema.parse(JSON.parse(manifestContent))
    commandCount = manifest.commands?.length ?? 0
    agentCount = manifest.agents?.length ?? 0

    // Count skills directories
    const skillsDir = join(pluginPath, 'skills')
    try {
      const skillEntries = await readdir(skillsDir, { withFileTypes: true })
      skillCount = skillEntries.filter((e) => e.isDirectory()).length
    } catch {
      // No skills directory
    }
  } catch {
    // Failed to read manifest
  }

  return {
    name: validation.name,
    description: validation.description,
    version: validation.version,
    filename: `${pluginName}.plugin`,
    commandCount,
    agentCount,
    skillCount,
  }
}

async function packPlugins(
  installable: Map<string, boolean>,
): Promise<PluginInfo[]> {
  console.log('Step 3: Packaging installable plugins...\n')

  await rm(OUTPUT_DIR, { recursive: true, force: true })
  await mkdir(OUTPUT_DIR, { recursive: true })

  const entries = await readdir(PLUGINS_DIR, { withFileTypes: true })
  const pluginDirs = entries.filter((e) => e.isDirectory())

  const plugins: PluginInfo[] = []
  let skipped = 0

  for (const entry of pluginDirs) {
    // Skip non-installable plugins
    if (!installable.get(entry.name)) {
      skipped++
      continue
    }

    const pluginPath = join(PLUGINS_DIR, entry.name)
    console.log(`Packing: ${entry.name}`)

    const result = await packPlugin(pluginPath, OUTPUT_DIR)

    if (result) {
      console.log(`✓ Packed: dist/plugins/${result.filename}\n`)
      plugins.push(result)
    }
  }

  const total = pluginDirs.length
  console.log(`\nPacked ${plugins.length} of ${total} plugins (${skipped} skipped)\n`)

  return plugins
}

async function generateMetadata(plugins: PluginInfo[]): Promise<void> {
  console.log('Step 4: Generating metadata and plugin imports...\n')

  await mkdir(GENERATED_DIR, { recursive: true })

  const imports = plugins
    .map(
      (p, i) =>
        `import plugin${i} from '../../dist/plugins/${p.filename}' with { type: 'file' }`,
    )
    .join('\n')

  const pluginEntries = plugins
    .map(
      (p, i) =>
        `  { name: ${JSON.stringify(p.name)}, description: ${JSON.stringify(p.description)}, version: ${JSON.stringify(p.version)}, commandCount: ${p.commandCount}, agentCount: ${p.agentCount}, skillCount: ${p.skillCount}, file: plugin${i} }`,
    )
    .join(',\n')

  const content = `// AUTO-GENERATED - DO NOT EDIT
// Generated by scripts/build.ts
// @ts-nocheck

${imports}

export const embeddedPlugins = [
${pluginEntries}
]
`

  await Bun.write(join(GENERATED_DIR, 'plugins-metadata.ts'), content)
  console.log(`Generated: src/generated/plugins-metadata.ts\n`)
}

async function compileBinary(): Promise<void> {
  console.log('Step 5: Compiling binary...\n')

  const proc = Bun.spawn(
    [
      'bun',
      'build',
      '--compile',
      '--minify',
      'src/cli.tsx',
      '--outfile',
      'dist/plugin-kit',
    ],
    {
      cwd: ROOT_DIR,
      stdout: 'inherit',
      stderr: 'inherit',
    },
  )

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    console.error('Compile failed')
    process.exit(1)
  }

  console.log('Compiled: dist/plugin-kit\n')
}

async function main() {
  console.log('Building plugin-kit...\n')

  // Step 1: Build plugin scripts
  await buildPluginScripts()

  // Step 2: Analyze plugin dependencies
  const installable = await analyzePlugins()

  // Step 3: Pack installable plugins
  const plugins = await packPlugins(installable)

  if (plugins.length === 0) {
    console.error('No installable plugins to build')
    process.exit(1)
  }

  // Step 4: Generate metadata
  await generateMetadata(plugins)

  // Step 5: Compile binary
  await compileBinary()

  console.log('Build complete!')
}

main()
