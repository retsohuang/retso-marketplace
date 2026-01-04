#!/usr/bin/env bun
import { access, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { PluginManifestSchema } from '../src/types/plugin'

export interface ValidationResult {
  valid: boolean
  message?: string
  name?: string
  description?: string
  version?: string
}

export async function validatePlugin(pluginPath: string): Promise<ValidationResult> {
  const pluginName = basename(pluginPath)

  // Check plugin.json exists
  const manifestPath = join(pluginPath, 'plugin.json')
  try {
    await access(manifestPath)
  } catch {
    return { valid: false, message: 'plugin.json not found' }
  }

  // Parse and validate plugin.json
  let manifest
  try {
    const content = await readFile(manifestPath, 'utf-8')
    manifest = JSON.parse(content)
  } catch (err) {
    return {
      valid: false,
      message: `Failed to parse plugin.json: ${err instanceof Error ? err.message : err}`,
    }
  }

  // Validate against schema
  const result = PluginManifestSchema.safeParse(manifest)
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    return { valid: false, message: `Invalid plugin.json: ${errors.join(', ')}` }
  }

  // Check plugin name matches directory name
  if (result.data.name !== pluginName) {
    return {
      valid: false,
      message: `Plugin name "${result.data.name}" does not match directory name "${pluginName}"`,
    }
  }

  // Validate commands exist
  if (result.data.commands) {
    for (const cmdPath of result.data.commands) {
      const cleanPath = cmdPath.replace(/^\.\//, '')
      const fullPath = join(pluginPath, cleanPath)
      try {
        await access(fullPath)
      } catch {
        return { valid: false, message: `Command file not found: ${cleanPath}` }
      }
    }
  }

  // Validate agents exist
  if (result.data.agents) {
    for (const agentPath of result.data.agents) {
      const cleanPath = agentPath.replace(/^\.\//, '')
      const fullPath = join(pluginPath, cleanPath)
      try {
        await access(fullPath)
      } catch {
        return { valid: false, message: `Agent file not found: ${cleanPath}` }
      }
    }
  }

  return {
    valid: true,
    name: result.data.name,
    description: result.data.description,
    version: result.data.version,
  }
}

// CLI usage
if (import.meta.main) {
  const pluginPath = process.argv[2]
  if (!pluginPath) {
    console.error('Usage: validate-plugin.ts <plugin-path>')
    process.exit(1)
  }

  const result = await validatePlugin(pluginPath)
  if (result.valid) {
    console.log(`✓ Valid: ${result.name} v${result.version}`)
  } else {
    console.error(`✗ Invalid: ${result.message}`)
    process.exit(1)
  }
}
