import { Box, Text, useApp, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useState } from 'react'
import type { PluginWithContent } from '../types/plugin'

type InstallLocationSelectorProps = {
  selectedPlugins: PluginWithContent[]
  onLocationSelect: (location: string) => void
}

type LocationOption = {
  label: string
  path: string
  isCustom?: boolean
}

const options: LocationOption[] = [
  { label: 'Project (.claude)', path: './.claude' },
  { label: 'Custom path...', path: '', isCustom: true },
]

export function InstallLocationSelector({
  selectedPlugins,
  onLocationSelect,
}: InstallLocationSelectorProps) {
  const { exit } = useApp()
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [customPath, setCustomPath] = useState('')
  const [inputMode, setInputMode] = useState(false)

  useInput((_input, key) => {
    if (key.escape) {
      if (inputMode) {
        setInputMode(false)
      } else {
        exit()
      }
    } else if (inputMode) {
      if (key.return && customPath.trim()) {
        onLocationSelect(customPath.trim())
      }
    } else {
      if (key.downArrow) {
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev))
      } else if (key.upArrow) {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (key.return) {
        const option = options[focusedIndex]
        if (option?.isCustom) {
          setInputMode(true)
        } else if (option) {
          onLocationSelect(option.path)
        }
      }
    }
  })

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column" borderStyle="round" padding={1}>
        <Text bold>
          Install location
          <Text dimColor> · {selectedPlugins.length} plugin(s) selected</Text>
        </Text>
        <Box marginTop={1} flexDirection="column">
          {inputMode ? (
            <Box flexDirection="column">
              <Text>Enter custom path:</Text>
              <Box
                marginTop={1}
                borderStyle="round"
                borderColor="blue"
                paddingLeft={1}
              >
                <Text color="blue">{'> '}</Text>
                <TextInput
                  value={customPath}
                  onChange={setCustomPath}
                  placeholder="/path/to/.claude"
                  focus={true}
                />
              </Box>
            </Box>
          ) : (
            options.map((option, index) => {
              const isFocused = index === focusedIndex
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
            })
          )}
        </Box>
      </Box>
      <Box marginLeft={2}>
        <Text dimColor>
          {inputMode
            ? 'Enter: Install · Esc: Back'
            : '↑↓: Navigate · Enter: Install · Esc: Exit'}
        </Text>
      </Box>
    </Box>
  )
}
