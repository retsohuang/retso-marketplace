import { Box, Text, useApp, useInput } from 'ink'
import { useState } from 'react'
import type { ExistingPlugin } from '../types/plugin'

type OverrideConfirmProps = {
  existingPlugins: ExistingPlugin[]
  onConfirm: (override: boolean) => void
}

export function OverrideConfirm({
  existingPlugins,
  onConfirm,
}: OverrideConfirmProps) {
  const { exit } = useApp()
  const [selectedIndex, setSelectedIndex] = useState(0)

  const options = [
    { label: 'Yes, override', value: true },
    { label: 'No, skip existing', value: false },
  ]

  useInput((_input, key) => {
    if (key.escape) {
      exit()
    } else if (key.downArrow || key.upArrow) {
      setSelectedIndex((prev) => (prev === 0 ? 1 : 0))
    } else if (key.return) {
      const option = options[selectedIndex]
      if (option) {
        onConfirm(option.value)
      }
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" borderStyle="round" padding={1}>
        <Text bold color="yellow">
          Warning: {existingPlugins.length} plugin(s) already installed
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {existingPlugins.map((existing) => (
            <Box key={existing.plugin.name} flexDirection="column">
              <Text dimColor>• {existing.plugin.name}</Text>
              {existing.contents && (
                <Text dimColor>
                  {'  '}Commands: {existing.contents.commandCount}, Agents:{' '}
                  {existing.contents.agentCount}, Skills:{' '}
                  {existing.contents.skillCount}
                </Text>
              )}
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text>Do you want to override?</Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {options.map((option, index) => {
            const isFocused = index === selectedIndex
            return (
              <Box key={option.label}>
                <Text color={isFocused ? 'blue' : undefined}>
                  {isFocused ? '❯ ' : '  '}
                </Text>
                <Text color={isFocused ? 'blue' : undefined}>
                  {isFocused ? '◉' : '○'}
                </Text>
                <Text> </Text>
                <Text bold={isFocused} color={isFocused ? 'blue' : undefined}>
                  {option.label}
                </Text>
              </Box>
            )
          })}
        </Box>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>↑↓: Navigate · Enter: Confirm · Esc: Exit</Text>
      </Box>
    </Box>
  )
}
