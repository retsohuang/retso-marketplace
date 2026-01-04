import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Volume, createFsFromVolume } from 'memfs'
import { analyzePlugin, type FsLike, SUPPORTED_IN_CLAUDE } from './analyze'

const PLUGIN_PATH = '/plugins/test-plugin'

let fs: FsLike
let vol: Volume

beforeEach(() => {
  vol = new Volume()
  const memfs = createFsFromVolume(vol)
  fs = {
    readdir: memfs.promises.readdir as FsLike['readdir'],
    readFile: memfs.promises.readFile as FsLike['readFile'],
  }
})

afterEach(() => {
  vol.reset()
})

describe('SUPPORTED_IN_CLAUDE', () => {
  test('includes commands, agents, and skills', () => {
    expect(SUPPORTED_IN_CLAUDE.has('commands')).toBe(true)
    expect(SUPPORTED_IN_CLAUDE.has('agents')).toBe(true)
    expect(SUPPORTED_IN_CLAUDE.has('skills')).toBe(true)
  })

  test('does not include scripts, rules, or templates', () => {
    expect(SUPPORTED_IN_CLAUDE.has('scripts')).toBe(false)
    expect(SUPPORTED_IN_CLAUDE.has('rules')).toBe(false)
    expect(SUPPORTED_IN_CLAUDE.has('templates')).toBe(false)
  })
})

describe('analyzePlugin', () => {
  test('returns installable for plugin with only supported directories', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/agents`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/hello.md`,
      '# Hello Command\nThis is a simple command.',
    )
    vol.writeFileSync(
      `${PLUGIN_PATH}/agents/helper.md`,
      '# Helper Agent\nThis agent helps with tasks.',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  test('returns installable for empty plugin', async () => {
    vol.mkdirSync(PLUGIN_PATH, { recursive: true })

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  test('detects CLAUDE_PLUGIN_ROOT usage in commands', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/init.md`,
      '# Init\nRun: node $CLAUDE_PLUGIN_ROOT/scripts/init.js',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(false)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('CLAUDE_PLUGIN_ROOT')
  })

  test('detects CLAUDE_PLUGIN_ROOT usage in agents', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/agents`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/agents/builder.md`,
      '# Builder\nUse script at $CLAUDE_PLUGIN_ROOT/scripts/build.js',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(false)
    expect(result.warnings[0]).toContain('CLAUDE_PLUGIN_ROOT')
  })

  test('detects CLAUDE_PLUGIN_ROOT usage in skills', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/skills/my-skill`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/skills/my-skill/SKILL.md`,
      '# My Skill\nRun: $CLAUDE_PLUGIN_ROOT/scripts/skill.js',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(false)
    expect(result.warnings[0]).toContain('CLAUDE_PLUGIN_ROOT')
  })

  test('detects references to scripts/ when scripts directory exists', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/scripts`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/build.md`,
      '# Build\nRun the CLI at scripts/dist/cli.js',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(false)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('scripts/')
    expect(result.warnings[0]).toContain('not installed to .claude')
  })

  test('detects references to rules/ when rules directory exists', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/rules`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/review.md`,
      '# Review\nApply rules from rules/code-quality.md',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(false)
    expect(result.warnings[0]).toContain('rules/')
  })

  test('detects references to templates/ when templates directory exists', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/templates`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/generate.md`,
      '# Generate\nUse template from templates/component.tsx',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(false)
    expect(result.warnings[0]).toContain('templates/')
  })

  test('does not flag references to non-existent directories', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    // Note: scripts/ directory does NOT exist
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/example.md`,
      '# Example\nMention scripts/foo but it does not exist as a directory',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  test('ignores hidden directories', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/.git`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/.vscode`, { recursive: true })
    vol.writeFileSync(`${PLUGIN_PATH}/commands/cmd.md`, '# Command\nSimple command')

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(true)
  })

  test('ignores node_modules directory', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/node_modules`, { recursive: true })
    vol.writeFileSync(`${PLUGIN_PATH}/commands/cmd.md`, '# Command\nSimple command')

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(true)
  })

  test('collects multiple warnings from different files', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/scripts`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/init.md`,
      '# Init\n$CLAUDE_PLUGIN_ROOT/scripts/init.js',
    )
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/build.md`,
      '# Build\nRun scripts/build.js',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(false)
    expect(result.warnings.length).toBeGreaterThanOrEqual(2)
  })

  test('scans nested directories in commands', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands/sub`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/scripts`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/sub/nested.md`,
      '# Nested\nUses scripts/tool.js',
    )

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(false)
    expect(result.warnings[0]).toContain('commands/sub/nested.md')
  })

  test('handles non-existent plugin path gracefully', async () => {
    const result = await analyzePlugin('/non/existent/path', fs)

    expect(result.installable).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  test('only scans .md files', async () => {
    vol.mkdirSync(`${PLUGIN_PATH}/commands`, { recursive: true })
    vol.mkdirSync(`${PLUGIN_PATH}/scripts`, { recursive: true })
    vol.writeFileSync(
      `${PLUGIN_PATH}/commands/readme.txt`,
      'Use scripts/tool.js',
    )
    vol.writeFileSync(`${PLUGIN_PATH}/commands/valid.md`, '# Valid\nNo issues here')

    const result = await analyzePlugin(PLUGIN_PATH, fs)

    expect(result.installable).toBe(true)
  })
})
