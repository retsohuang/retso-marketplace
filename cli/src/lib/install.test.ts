import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Volume, createFsFromVolume } from 'memfs'
import {
  checkExistingPlugins,
  expandPath,
  type InstallFsLike,
} from './install'
import type { PluginWithContent } from '../types/plugin'

const TARGET_DIR = '/home/user/.claude'

let fs: InstallFsLike
let vol: Volume

function createMockPlugin(
  name: string,
  overrides?: Partial<PluginWithContent>,
): PluginWithContent {
  return {
    name,
    description: `${name} description`,
    version: '1.0.0',
    commandCount: 2,
    agentCount: 1,
    skillCount: 1,
    getContent: async () => new ArrayBuffer(0),
    ...overrides,
  }
}

beforeEach(() => {
  vol = new Volume()
  const memfs = createFsFromVolume(vol)
  fs = {
    access: memfs.promises.access as InstallFsLike['access'],
  }
})

afterEach(() => {
  vol.reset()
})

describe('expandPath', () => {
  test('expands ~/ to home directory', () => {
    const result = expandPath('~/.claude')

    expect(result).toMatch(/^\//)
    expect(result).toContain('.claude')
    expect(result).not.toContain('~')
  })

  test('expands single ~ to home directory', () => {
    const result = expandPath('~')

    expect(result).toMatch(/^\//)
    expect(result).not.toContain('~')
  })

  test('preserves absolute paths', () => {
    const result = expandPath('/home/user/.claude')

    expect(result).toBe('/home/user/.claude')
  })

  test('preserves relative paths', () => {
    const result = expandPath('./local/.claude')

    expect(result).toBe('./local/.claude')
  })

  test('handles tilde in middle of path', () => {
    const result = expandPath('/path/with~/tilde')

    expect(result).toBe('/path/with~/tilde')
  })

  test('handles ~user syntax (passes through)', () => {
    const result = expandPath('~user/.claude')

    expect(result).toBe('~user/.claude')
  })
})

describe('checkExistingPlugins', () => {
  test('returns empty array when no plugins exist', async () => {
    vol.mkdirSync(TARGET_DIR, { recursive: true })

    const plugins = [createMockPlugin('my-plugin')]
    const result = await checkExistingPlugins(plugins, TARGET_DIR, fs)

    expect(result).toHaveLength(0)
  })

  test('detects existing plugin by commands namespace', async () => {
    vol.mkdirSync(`${TARGET_DIR}/commands/my-plugin`, { recursive: true })

    const plugins = [createMockPlugin('my-plugin')]
    const result = await checkExistingPlugins(plugins, TARGET_DIR, fs)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      plugin: { name: 'my-plugin', description: 'my-plugin description' },
      path: `${TARGET_DIR}/commands/my-plugin`,
      contents: {
        commandCount: 2,
        agentCount: 1,
        skillCount: 1,
      },
    })
  })

  test('detects multiple existing plugins', async () => {
    vol.mkdirSync(`${TARGET_DIR}/commands/plugin-a`, { recursive: true })
    vol.mkdirSync(`${TARGET_DIR}/commands/plugin-b`, { recursive: true })

    const plugins = [
      createMockPlugin('plugin-a'),
      createMockPlugin('plugin-b'),
      createMockPlugin('plugin-c'),
    ]
    const result = await checkExistingPlugins(plugins, TARGET_DIR, fs)

    expect(result).toHaveLength(2)
    expect(result.map((p) => p.plugin.name)).toContain('plugin-a')
    expect(result.map((p) => p.plugin.name)).toContain('plugin-b')
    expect(result.map((p) => p.plugin.name)).not.toContain('plugin-c')
  })

  test('includes plugin contents in result', async () => {
    vol.mkdirSync(`${TARGET_DIR}/commands/my-plugin`, { recursive: true })

    const plugins = [
      createMockPlugin('my-plugin', {
        commandCount: 5,
        agentCount: 3,
        skillCount: 2,
      }),
    ]
    const result = await checkExistingPlugins(plugins, TARGET_DIR, fs)

    expect(result[0]?.contents).toEqual({
      commandCount: 5,
      agentCount: 3,
      skillCount: 2,
    })
  })

  test('handles empty plugin list', async () => {
    vol.mkdirSync(`${TARGET_DIR}/commands/some-plugin`, { recursive: true })

    const result = await checkExistingPlugins([], TARGET_DIR, fs)

    expect(result).toHaveLength(0)
  })

  test('returns correct path for each existing plugin', async () => {
    vol.mkdirSync(`${TARGET_DIR}/commands/first`, { recursive: true })
    vol.mkdirSync(`${TARGET_DIR}/commands/second`, { recursive: true })

    const plugins = [createMockPlugin('first'), createMockPlugin('second')]
    const result = await checkExistingPlugins(plugins, TARGET_DIR, fs)

    expect(result.find((p) => p.plugin.name === 'first')?.path).toBe(
      `${TARGET_DIR}/commands/first`,
    )
    expect(result.find((p) => p.plugin.name === 'second')?.path).toBe(
      `${TARGET_DIR}/commands/second`,
    )
  })

  test('handles target directory that does not exist', async () => {
    const plugins = [createMockPlugin('my-plugin')]
    const result = await checkExistingPlugins(
      plugins,
      '/nonexistent/path',
      fs,
    )

    expect(result).toHaveLength(0)
  })

  test('expands tilde in target directory', async () => {
    const homedir = require('node:os').homedir()
    vol.mkdirSync(`${homedir}/.claude/commands/my-plugin`, { recursive: true })

    const plugins = [createMockPlugin('my-plugin')]
    const result = await checkExistingPlugins(plugins, '~/.claude', fs)

    expect(result).toHaveLength(1)
  })

  test('does not detect plugin if only agents exist (no commands namespace)', async () => {
    vol.mkdirSync(`${TARGET_DIR}/agents`, { recursive: true })
    vol.writeFileSync(`${TARGET_DIR}/agents/helper.md`, '# Helper')

    const plugins = [createMockPlugin('my-plugin')]
    const result = await checkExistingPlugins(plugins, TARGET_DIR, fs)

    expect(result).toHaveLength(0)
  })

  test('does not detect plugin if only skills exist (no commands namespace)', async () => {
    vol.mkdirSync(`${TARGET_DIR}/skills/my-skill`, { recursive: true })

    const plugins = [createMockPlugin('my-plugin')]
    const result = await checkExistingPlugins(plugins, TARGET_DIR, fs)

    expect(result).toHaveLength(0)
  })
})
