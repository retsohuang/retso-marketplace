import { Box, Text } from 'ink'
import type { PluginWithContent } from '../types/plugin'

type PluginListProps = {
  plugins: PluginWithContent[]
}

function PluginItem({ plugin }: { plugin: PluginWithContent }) {
  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Text bold color="cyan">
        {plugin.name}
        <Text dimColor> v{plugin.version}</Text>
      </Text>
      <Text dimColor>{plugin.description}</Text>
    </Box>
  )
}

export function PluginList({ plugins }: PluginListProps) {
  if (plugins.length === 0) {
    return <Text color="yellow">No plugins found.</Text>
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Available Plugins:</Text>
      {plugins.map((plugin) => (
        <PluginItem key={plugin.name} plugin={plugin} />
      ))}
    </Box>
  )
}
