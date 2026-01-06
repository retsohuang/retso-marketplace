import { access, copyFile, mkdir, readFile, rename, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type {
  ExistingPlugin,
  InstalledItems,
  InstallResult,
  PluginWithContent,
} from '../types/plugin'
import { PluginManifestSchema } from '../types/plugin'
import { transformPlugin } from './transform'

export interface InstallFsLike {
  access: (path: string) => Promise<void>
}

const defaultFs: InstallFsLike = {
  access,
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['which', cmd], { stdout: 'pipe', stderr: 'pipe' })
    return (await proc.exited) === 0
  } catch {
    return false
  }
}

type MoveResult = { method: 'trash' } | { method: 'backup'; backupPath: string }

async function moveToTrash(path: string): Promise<MoveResult> {
  if (await commandExists('trash')) {
    const proc = Bun.spawn(['trash', path], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const exitCode = await proc.exited
    if (exitCode === 0) {
      return { method: 'trash' }
    }
  }

  let backupPath = `${path}_backup`

  try {
    await access(backupPath)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    backupPath = `${path}_backup_${timestamp}`
  } catch {
    // Backup doesn't exist
  }

  await rename(path, backupPath)
  return { method: 'backup', backupPath }
}

export function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2))
  }
  if (path === '~') {
    return homedir()
  }
  return path
}

export async function checkExistingPlugins(
  plugins: PluginWithContent[],
  targetDir: string,
  fs: InstallFsLike = defaultFs,
): Promise<ExistingPlugin[]> {
  const expandedDir = expandPath(targetDir)
  const existing: ExistingPlugin[] = []

  for (const plugin of plugins) {
    // Check if commands namespace exists
    const commandsPath = join(expandedDir, 'commands', plugin.name)
    try {
      await fs.access(commandsPath)
      existing.push({
        plugin: { name: plugin.name, description: plugin.description },
        path: commandsPath,
        contents: {
          commandCount: plugin.commandCount,
          agentCount: plugin.agentCount,
          skillCount: plugin.skillCount,
        },
      })
      continue
    } catch {
      // Doesn't exist
    }
  }

  return existing
}

async function extractZip(
  zipBytes: ArrayBuffer,
  targetDir: string,
): Promise<void> {
  const tempZip = join(tmpdir(), `plugin-${Date.now()}.zip`)
  await Bun.write(tempZip, zipBytes)

  try {
    const proc = Bun.spawn(['unzip', '-o', '-d', targetDir, tempZip], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      throw new Error(`Failed to extract: ${stderr}`)
    }
  } finally {
    await rm(tempZip, { force: true })
  }
}

async function copyDirectory(source: string, target: string): Promise<void> {
  const proc = Bun.spawn(['cp', '-R', source, target], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    throw new Error(`Failed to copy: ${stderr}`)
  }
}

export async function installPlugins(
  plugins: PluginWithContent[],
  targetDir: string,
  options?: { override?: boolean },
): Promise<InstallResult[]> {
  const expandedDir = expandPath(targetDir)
  const results: InstallResult[] = []

  for (const plugin of plugins) {
    let movedToTrash = false
    let backupPath: string | undefined
    const targetPath = join(expandedDir, 'commands', plugin.name)

    try {
      // Get ZIP content and extract to temp directory
      const zipBytes = await plugin.getContent()
      const tempDir = join(tmpdir(), `plugin-extract-${Date.now()}`)
      await mkdir(tempDir, { recursive: true })

      try {
        await extractZip(zipBytes, tempDir)

        // Read plugin.json from extracted content
        const manifestPath = join(tempDir, 'plugin.json')
        const manifestContent = await readFile(manifestPath, 'utf-8')
        const manifest = PluginManifestSchema.parse(JSON.parse(manifestContent))

        // Get transformation mapping
        const transform = await transformPlugin(
          plugin.name,
          manifest,
          tempDir,
          expandedDir,
        )

        // Handle override for existing commands
        if (options?.override) {
          const commandsDir = join(expandedDir, 'commands', plugin.name)
          try {
            await access(commandsDir)
            const result = await moveToTrash(commandsDir)
            if (result.method === 'trash') {
              movedToTrash = true
            } else {
              backupPath = result.backupPath
            }
          } catch {
            // Doesn't exist
          }
        }

        // Track installed items
        const installed: InstalledItems = {
          commands: [],
          agents: [],
          skills: [],
        }

        // Copy commands (namespaced)
        for (const { source, target } of transform.commands) {
          await mkdir(dirname(target), { recursive: true })
          await copyFile(source, target)
          installed.commands.push(target)
        }

        // Copy agents (flattened)
        for (const { source, target } of transform.agents) {
          await mkdir(dirname(target), { recursive: true })
          await copyFile(source, target)
          installed.agents.push(target)
        }

        // Copy skills (keep structure)
        for (const { source, target } of transform.skills) {
          await mkdir(dirname(target), { recursive: true })
          await copyDirectory(source, target)
          installed.skills.push(target)
        }

        results.push({
          plugin: { name: plugin.name, description: plugin.description },
          success: true,
          targetPath,
          installed,
          movedToTrash: movedToTrash || undefined,
          backupPath,
        })
      } finally {
        await rm(tempDir, { recursive: true, force: true })
      }
    } catch (err) {
      results.push({
        plugin: { name: plugin.name, description: plugin.description },
        success: false,
        targetPath,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return results
}
