import { embeddedPlugins } from '../generated/plugins-metadata'
import type { PluginWithContent } from '../types/plugin'

export function discoverPlugins(): PluginWithContent[] {
  return embeddedPlugins.map((p) => ({
    name: p.name,
    description: p.description,
    version: p.version,
    commandCount: p.commandCount,
    agentCount: p.agentCount,
    skillCount: p.skillCount,
    getContent: () => Bun.file(p.file).arrayBuffer(),
  }))
}
