import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { AnalysisResult } from '../types/plugin'

const BROKEN_REFERENCES = [
  { pattern: /rules\//g, message: 'references rules/ directory' },
  { pattern: /templates\//g, message: 'references templates/ directory' },
  { pattern: /scripts\//g, message: 'references scripts/ directory' },
  { pattern: /scripts\/dist\//g, message: 'references scripts/dist/' },
  { pattern: /CLAUDE_PLUGIN_ROOT/g, message: 'uses CLAUDE_PLUGIN_ROOT variable' },
]

async function scanMarkdownFile(
  filePath: string,
  pluginPath: string,
): Promise<string[]> {
  const warnings: string[] = []

  try {
    const content = await readFile(filePath, 'utf-8')
    const relativePath = filePath.replace(pluginPath + '/', '')

    for (const { pattern, message } of BROKEN_REFERENCES) {
      if (pattern.test(content)) {
        warnings.push(`${relativePath} ${message}`)
        pattern.lastIndex = 0
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }

  return warnings
}

async function scanDirectory(
  dirPath: string,
  pluginPath: string,
): Promise<string[]> {
  const warnings: string[] = []

  try {
    const entries = await readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        const subWarnings = await scanDirectory(fullPath, pluginPath)
        warnings.push(...subWarnings)
      } else if (entry.name.endsWith('.md')) {
        const fileWarnings = await scanMarkdownFile(fullPath, pluginPath)
        warnings.push(...fileWarnings)
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return warnings
}

export async function analyzePlugin(pluginPath: string): Promise<AnalysisResult> {
  const warnings: string[] = []

  // Scan commands directory
  const commandsDir = join(pluginPath, 'commands')
  const commandWarnings = await scanDirectory(commandsDir, pluginPath)
  warnings.push(...commandWarnings)

  // Scan agents directory
  const agentsDir = join(pluginPath, 'agents')
  const agentWarnings = await scanDirectory(agentsDir, pluginPath)
  warnings.push(...agentWarnings)

  // Scan skills directory
  const skillsDir = join(pluginPath, 'skills')
  const skillWarnings = await scanDirectory(skillsDir, pluginPath)
  warnings.push(...skillWarnings)

  return {
    installable: warnings.length === 0,
    warnings,
  }
}
