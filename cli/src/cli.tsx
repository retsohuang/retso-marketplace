#!/usr/bin/env bun
import { Box, render, Text, useApp, useStdin } from 'ink'
import { useEffect, useState } from 'react'
import { InstallLocationSelector } from './components/InstallLocationSelector'
import { OverrideConfirm } from './components/OverrideConfirm'
import { PluginList } from './components/PluginList'
import { SearchablePluginList } from './components/SearchablePluginList'
import {
  checkExistingPlugins,
  installPlugins,
} from './lib/install'
import { discoverPlugins } from './lib/plugins'
import type { ExistingPlugin, InstallResult, PluginWithContent } from './types/plugin'

type Step =
  | 'selection'
  | 'install-location'
  | 'confirm-override'
  | 'installing'
  | 'complete'

function App() {
  const { exit } = useApp()
  const { isRawModeSupported } = useStdin()
  const [plugins, setPlugins] = useState<PluginWithContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('selection')
  const [selectedPlugins, setSelectedPlugins] = useState<PluginWithContent[]>([])
  const [installLocation, setInstallLocation] = useState<string>('')
  const [existingPlugins, setExistingPlugins] = useState<ExistingPlugin[]>([])
  const [installResults, setInstallResults] = useState<InstallResult[]>([])

  useEffect(() => {
    try {
      setPlugins(discoverPlugins())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return <Text>Loading plugins...</Text>
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>
  }

  // Non-interactive fallback
  if (!isRawModeSupported) {
    return <PluginList plugins={plugins} />
  }

  // Step 3: Installing
  if (step === 'installing') {
    return (
      <Box padding={1}>
        <Text>Installing {selectedPlugins.length} plugin(s)...</Text>
      </Box>
    )
  }

  // Step 4: Complete
  if (step === 'complete') {
    const successful = installResults.filter((r) => r.success)
    const failed = installResults.filter((r) => !r.success)
    const trashed = successful.filter((r) => r.movedToTrash)
    const backedUp = successful.filter((r) => r.backupPath)

    // Count total installed items
    const totalCommands = successful.reduce(
      (sum, r) => sum + (r.installed?.commands.length ?? 0),
      0,
    )
    const totalAgents = successful.reduce(
      (sum, r) => sum + (r.installed?.agents.length ?? 0),
      0,
    )
    const totalSkills = successful.reduce(
      (sum, r) => sum + (r.installed?.skills.length ?? 0),
      0,
    )

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">
          Installation complete
        </Text>
        {successful.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text>Installed {successful.length} plugin(s):</Text>
            {successful.map((r) => (
              <Box key={r.plugin.name} flexDirection="column">
                <Text color="green">✓ {r.plugin.name}</Text>
                {r.installed && r.installed.commands.length > 0 && (
                  <Text dimColor>  Commands: {r.installed.commands.length}</Text>
                )}
                {r.installed && r.installed.agents.length > 0 && (
                  <Text dimColor>  Agents: {r.installed.agents.length}</Text>
                )}
                {r.installed && r.installed.skills.length > 0 && (
                  <Text dimColor>  Skills: {r.installed.skills.length}</Text>
                )}
              </Box>
            ))}
            <Box marginTop={1}>
              <Text dimColor>
                Total: {totalCommands} command(s), {totalAgents} agent(s), {totalSkills} skill(s)
              </Text>
            </Box>
          </Box>
        )}
        {trashed.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">
              Moved {trashed.length} existing plugin(s) to trash
            </Text>
          </Box>
        )}
        {backedUp.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">
              Backed up {backedUp.length} existing plugin(s):
            </Text>
            {backedUp.map((r) => (
              <Text key={r.plugin.name} color="yellow">
                ↪ {r.plugin.name} → {r.backupPath}
              </Text>
            ))}
          </Box>
        )}
        {failed.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="red">Failed to install {failed.length} plugin(s):</Text>
            {failed.map((r) => (
              <Text key={r.plugin.name} color="red">
                ✗ {r.plugin.name}: {r.error}
              </Text>
            ))}
          </Box>
        )}
      </Box>
    )
  }

  // Step 2.5: Confirm override
  if (step === 'confirm-override') {
    const doInstall = async (
      pluginsToInstall: PluginWithContent[],
      override?: boolean,
    ) => {
      setStep('installing')
      const results = await installPlugins(pluginsToInstall, installLocation, {
        override,
      })
      setInstallResults(results)
      setStep('complete')
      setTimeout(() => exit(), 100)
    }

    return (
      <OverrideConfirm
        existingPlugins={existingPlugins}
        onConfirm={async (override) => {
          if (override) {
            await doInstall(selectedPlugins, true)
          } else {
            const existingNames = new Set(
              existingPlugins.map((e) => e.plugin.name),
            )
            const newPlugins = selectedPlugins.filter(
              (p) => !existingNames.has(p.name),
            )
            if (newPlugins.length > 0) {
              await doInstall(newPlugins)
            } else {
              exit()
            }
          }
        }}
      />
    )
  }

  // Step 2: Install location selection
  if (step === 'install-location') {
    return (
      <InstallLocationSelector
        selectedPlugins={selectedPlugins}
        onLocationSelect={async (location) => {
          setInstallLocation(location)
          const existing = await checkExistingPlugins(selectedPlugins, location)
          if (existing.length > 0) {
            setExistingPlugins(existing)
            setStep('confirm-override')
          } else {
            setStep('installing')
            const results = await installPlugins(selectedPlugins, location)
            setInstallResults(results)
            setStep('complete')
            setTimeout(() => exit(), 100)
          }
        }}
      />
    )
  }

  // Step 1: Plugin selection
  return (
    <SearchablePluginList
      plugins={plugins}
      onSelect={(selected) => {
        setSelectedPlugins(selected)
        setStep('install-location')
      }}
    />
  )
}

render(<App />)
