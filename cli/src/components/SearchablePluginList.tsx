import { Box, Text, useApp, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useMemo, useState } from 'react'
import type { PluginWithContent } from '../types/plugin'

type SearchablePluginListProps = {
  plugins: PluginWithContent[]
  onSelect?: (plugins: PluginWithContent[]) => void
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

export function SearchablePluginList({
  plugins,
  onSelect,
}: SearchablePluginListProps) {
  const { exit } = useApp()
  const [search, setSearch] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set())
  const [inputFocused, setInputFocused] = useState(false)

  const filteredPlugins = useMemo(() => {
    if (!search.trim()) return plugins
    const query = search.toLowerCase()
    return plugins.filter(
      (plugin) =>
        plugin.name.toLowerCase().includes(query) ||
        plugin.description.toLowerCase().includes(query),
    )
  }, [plugins, search])

  // Reset focus when filter changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on filter length change
  useMemo(() => {
    setFocusedIndex(0)
  }, [filteredPlugins.length])

  const toggleSelection = (pluginName: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev)
      if (next.has(pluginName)) {
        next.delete(pluginName)
      } else {
        next.add(pluginName)
      }
      return next
    })
  }

  useInput((input, key) => {
    if (key.escape) {
      if (inputFocused) {
        setInputFocused(false)
      } else {
        exit()
      }
    } else if (key.downArrow) {
      setInputFocused(false)
      setFocusedIndex((prev) =>
        prev < filteredPlugins.length - 1 ? prev + 1 : prev,
      )
    } else if (key.upArrow) {
      setInputFocused(false)
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
    } else if (input === ' ' && !inputFocused && filteredPlugins[focusedIndex]) {
      toggleSelection(filteredPlugins[focusedIndex].name)
    } else if (key.return) {
      const selected = plugins.filter((p) => selectedNames.has(p.name))
      if (selected.length > 0) {
        onSelect?.(selected)
      }
    } else if (input && !key.ctrl && !key.meta) {
      if (!inputFocused) {
        setInputFocused(true)
      }
    }
  })

  const visibleCount = 5
  const startIndex = Math.max(
    0,
    Math.min(focusedIndex - 2, filteredPlugins.length - visibleCount),
  )
  const visiblePlugins = filteredPlugins.slice(
    startIndex,
    startIndex + visibleCount,
  )
  const hasMoreBelow = startIndex + visibleCount < filteredPlugins.length

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" borderStyle="round" padding={1}>
        <Text bold>
          Discover plugins ({filteredPlugins.length}/{plugins.length})
          {selectedNames.size > 0 && (
            <Text color="green"> · {selectedNames.size} selected</Text>
          )}
        </Text>
        <Box
          marginBottom={1}
          borderStyle="round"
          borderColor={inputFocused ? 'blue' : undefined}
          paddingLeft={1}
        >
          <Text
            dimColor={!inputFocused}
            color={inputFocused ? 'blue' : undefined}
          >
            {inputFocused ? '● ' : '○ '}
          </Text>
          <TextInput
            value={search}
            onChange={setSearch}
            placeholder="Search..."
            focus={inputFocused}
          />
        </Box>
        {filteredPlugins.length === 0 ? (
          <Box paddingLeft={2}>
            <Text color="yellow">No plugins found matching "{search}"</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {visiblePlugins.map((plugin, index) => {
              const actualIndex = startIndex + index
              const isFocused = actualIndex === focusedIndex
              const isSelected = selectedNames.has(plugin.name)
              return (
                <PluginRow
                  key={plugin.name}
                  plugin={plugin}
                  isFocused={isFocused}
                  isSelected={isSelected}
                />
              )
            })}
            {hasMoreBelow && (
              <Box paddingLeft={2}>
                <Text dimColor>↓ more below</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>
          {`Type to search · ↑↓: Navigate · Space: Select${selectedNames.size > 0 ? ' · Enter: Install' : ''} · Esc: Exit`}
        </Text>
      </Box>
    </Box>
  )
}

function PluginRow({
  plugin,
  isFocused,
  isSelected,
}: {
  plugin: PluginWithContent
  isFocused: boolean
  isSelected: boolean
}) {
  const maxDescLength = 200
  const truncatedDesc = truncate(plugin.description, maxDescLength)

  const getIndicator = () => {
    if (isSelected) return '◉'
    return '○'
  }

  const getColor = () => {
    if (isFocused) return 'blue'
    if (isSelected) return 'green'
    return undefined
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={isFocused ? 'blue' : undefined}>
          {isFocused ? '❯ ' : '  '}
        </Text>
        <Text color={getColor()}>{getIndicator()}</Text>
        <Text> </Text>
        <Text
          bold
          color={isFocused ? 'blue' : isSelected ? 'green' : undefined}
        >
          {plugin.name}
        </Text>
        <Text dimColor> v{plugin.version}</Text>
      </Box>
      <Box paddingLeft={4}>
        <Text color={isFocused || isSelected ? undefined : 'gray'}>
          {truncatedDesc}
        </Text>
      </Box>
    </Box>
  )
}
