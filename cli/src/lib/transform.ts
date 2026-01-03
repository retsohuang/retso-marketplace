import { readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { PluginManifest, TransformResult } from '../types/plugin'

export async function transformPlugin(
  pluginName: string,
  manifest: PluginManifest,
  pluginPath: string,
  targetDir: string,
): Promise<TransformResult> {
  const result: TransformResult = {
    commands: [],
    agents: [],
    skills: [],
  }

  // Transform commands: namespace by plugin name
  if (manifest.commands) {
    for (const cmdPath of manifest.commands) {
      const cleanPath = cmdPath.replace(/^\.\//, '')
      const filename = basename(cleanPath)
      result.commands.push({
        source: join(pluginPath, cleanPath),
        target: join(targetDir, 'commands', pluginName, filename),
      })
    }
  }

  // Transform agents: flatten to agents directory
  if (manifest.agents) {
    for (const agentPath of manifest.agents) {
      const cleanPath = agentPath.replace(/^\.\//, '')
      const filename = basename(cleanPath)
      result.agents.push({
        source: join(pluginPath, cleanPath),
        target: join(targetDir, 'agents', filename),
      })
    }
  }

  // Transform skills: keep directory structure
  const skillsDir = join(pluginPath, 'skills')
  try {
    const skillsStat = await stat(skillsDir)
    if (skillsStat.isDirectory()) {
      const entries = await readdir(skillsDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          result.skills.push({
            source: join(skillsDir, entry.name),
            target: join(targetDir, 'skills', entry.name),
          })
        }
      }
    }
  } catch {
    // No skills directory
  }

  return result
}

export function getInstallableDirectories(manifest: PluginManifest): string[] {
  const dirs: string[] = []

  if (manifest.commands && manifest.commands.length > 0) {
    dirs.push('commands')
  }

  if (manifest.agents && manifest.agents.length > 0) {
    dirs.push('agents')
  }

  return dirs
}
