import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Volume, createFsFromVolume } from 'memfs'
import {
  getInstallableDirectories,
  transformPlugin,
  type TransformFsLike,
} from './transform'
import type { PluginManifest } from '../types/plugin'

const PLUGIN_PATH = '/plugins/test-plugin'
const TARGET_DIR = '/home/user/.claude'

let fs: TransformFsLike
let vol: Volume

beforeEach(() => {
  vol = new Volume()
  const memfs = createFsFromVolume(vol)
  fs = {
    stat: memfs.promises.stat as TransformFsLike['stat'],
    readdir: memfs.promises.readdir as TransformFsLike['readdir'],
  }
})

afterEach(() => {
  vol.reset()
})

describe('transformPlugin', () => {
  describe('commands transformation', () => {
    test('namespaces commands by plugin name', async () => {
      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
        commands: ['./commands/hello.md', './commands/world.md'],
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.commands).toHaveLength(2)
      expect(result.commands[0]).toEqual({
        source: '/plugins/test-plugin/commands/hello.md',
        target: '/home/user/.claude/commands/my-plugin/hello.md',
      })
      expect(result.commands[1]).toEqual({
        source: '/plugins/test-plugin/commands/world.md',
        target: '/home/user/.claude/commands/my-plugin/world.md',
      })
    })

    test('handles commands without ./ prefix', async () => {
      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
        commands: ['commands/hello.md'],
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.commands[0]).toEqual({
        source: '/plugins/test-plugin/commands/hello.md',
        target: '/home/user/.claude/commands/my-plugin/hello.md',
      })
    })

    test('handles nested command paths', async () => {
      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
        commands: ['./commands/sub/nested.md'],
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.commands[0]).toEqual({
        source: '/plugins/test-plugin/commands/sub/nested.md',
        target: '/home/user/.claude/commands/my-plugin/nested.md',
      })
    })

    test('returns empty commands array when no commands in manifest', async () => {
      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.commands).toHaveLength(0)
    })
  })

  describe('agents transformation', () => {
    test('flattens agents to agents directory', async () => {
      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
        agents: ['./agents/helper.md', './agents/worker.md'],
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.agents).toHaveLength(2)
      expect(result.agents[0]).toEqual({
        source: '/plugins/test-plugin/agents/helper.md',
        target: '/home/user/.claude/agents/helper.md',
      })
      expect(result.agents[1]).toEqual({
        source: '/plugins/test-plugin/agents/worker.md',
        target: '/home/user/.claude/agents/worker.md',
      })
    })

    test('handles agents without ./ prefix', async () => {
      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
        agents: ['agents/helper.md'],
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.agents[0]).toEqual({
        source: '/plugins/test-plugin/agents/helper.md',
        target: '/home/user/.claude/agents/helper.md',
      })
    })

    test('returns empty agents array when no agents in manifest', async () => {
      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.agents).toHaveLength(0)
    })
  })

  describe('skills transformation', () => {
    test('preserves skill directory structure', async () => {
      vol.mkdirSync(`${PLUGIN_PATH}/skills/code-review`, { recursive: true })
      vol.mkdirSync(`${PLUGIN_PATH}/skills/test-helper`, { recursive: true })

      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.skills).toHaveLength(2)
      expect(result.skills).toContainEqual({
        source: '/plugins/test-plugin/skills/code-review',
        target: '/home/user/.claude/skills/code-review',
      })
      expect(result.skills).toContainEqual({
        source: '/plugins/test-plugin/skills/test-helper',
        target: '/home/user/.claude/skills/test-helper',
      })
    })

    test('ignores files in skills directory', async () => {
      vol.mkdirSync(`${PLUGIN_PATH}/skills/valid-skill`, { recursive: true })
      vol.writeFileSync(`${PLUGIN_PATH}/skills/README.md`, '# Skills')

      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.skills).toHaveLength(1)
      expect(result.skills[0]).toEqual({
        source: '/plugins/test-plugin/skills/valid-skill',
        target: '/home/user/.claude/skills/valid-skill',
      })
    })

    test('returns empty skills array when no skills directory', async () => {
      vol.mkdirSync(PLUGIN_PATH, { recursive: true })

      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.skills).toHaveLength(0)
    })

    test('returns empty skills array when skills is a file', async () => {
      vol.mkdirSync(PLUGIN_PATH, { recursive: true })
      vol.writeFileSync(`${PLUGIN_PATH}/skills`, 'not a directory')

      const manifest: PluginManifest = {
        name: 'my-plugin',
        description: 'Test plugin',
        version: '1.0.0',
      }

      const result = await transformPlugin(
        'my-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.skills).toHaveLength(0)
    })
  })

  describe('combined transformation', () => {
    test('handles plugin with commands, agents, and skills', async () => {
      vol.mkdirSync(`${PLUGIN_PATH}/skills/my-skill`, { recursive: true })

      const manifest: PluginManifest = {
        name: 'full-plugin',
        description: 'A complete plugin',
        version: '1.0.0',
        commands: ['./commands/cmd.md'],
        agents: ['./agents/agent.md'],
      }

      const result = await transformPlugin(
        'full-plugin',
        manifest,
        PLUGIN_PATH,
        TARGET_DIR,
        fs,
      )

      expect(result.commands).toHaveLength(1)
      expect(result.agents).toHaveLength(1)
      expect(result.skills).toHaveLength(1)
    })
  })
})

describe('getInstallableDirectories', () => {
  test('returns commands when manifest has commands', () => {
    const manifest: PluginManifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
      commands: ['./commands/hello.md'],
    }

    const dirs = getInstallableDirectories(manifest)

    expect(dirs).toContain('commands')
    expect(dirs).not.toContain('agents')
  })

  test('returns agents when manifest has agents', () => {
    const manifest: PluginManifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
      agents: ['./agents/helper.md'],
    }

    const dirs = getInstallableDirectories(manifest)

    expect(dirs).toContain('agents')
    expect(dirs).not.toContain('commands')
  })

  test('returns both commands and agents when both exist', () => {
    const manifest: PluginManifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
      commands: ['./commands/hello.md'],
      agents: ['./agents/helper.md'],
    }

    const dirs = getInstallableDirectories(manifest)

    expect(dirs).toContain('commands')
    expect(dirs).toContain('agents')
  })

  test('returns empty array when no commands or agents', () => {
    const manifest: PluginManifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
    }

    const dirs = getInstallableDirectories(manifest)

    expect(dirs).toHaveLength(0)
  })

  test('ignores empty commands array', () => {
    const manifest: PluginManifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
      commands: [],
    }

    const dirs = getInstallableDirectories(manifest)

    expect(dirs).not.toContain('commands')
  })

  test('ignores empty agents array', () => {
    const manifest: PluginManifest = {
      name: 'test',
      description: 'Test',
      version: '1.0.0',
      agents: [],
    }

    const dirs = getInstallableDirectories(manifest)

    expect(dirs).not.toContain('agents')
  })
})
