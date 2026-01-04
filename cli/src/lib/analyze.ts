import * as nodeFs from 'node:fs/promises'
import { join } from 'node:path'
import type { AnalysisResult } from '../types/plugin'

/**
 * File system interface for dependency injection (testing with memfs)
 */
export type FsLike = {
  readdir: typeof nodeFs.readdir
  readFile: typeof nodeFs.readFile
}

const defaultFs: FsLike = {
  readdir: nodeFs.readdir,
  readFile: nodeFs.readFile,
}

/**
 * Directories supported in .claude directory structure.
 * Based on Claude Code documentation:
 * https://docs.anthropic.com/en/docs/claude-code
 *
 * Supported:
 * - commands/ - Custom slash commands (.md files)
 * - agents/ - Project-level subagents (.md files)
 * - settings.json - Project-level configuration
 * - settings.local.json - Personal project overrides
 * - CLAUDE.md - Project documentation
 * - CLAUDE.local.md - Personal working info
 *
 * NOT supported (plugin-only):
 * - scripts/ - Build scripts, CLI tools
 * - rules/ - Code review rules
 * - templates/ - File templates
 * - hooks/ - Hook scripts (config goes in settings.json)
 */
export const SUPPORTED_IN_CLAUDE = new Set(['commands', 'agents', 'skills'])

/**
 * Plugin-specific features that won't work when installed to .claude
 */
const PLUGIN_ONLY_PATTERNS = [
  { pattern: /CLAUDE_PLUGIN_ROOT/g, message: 'uses CLAUDE_PLUGIN_ROOT (plugin-only variable)' },
]

/**
 * Check if plugin has directories that won't be installed to .claude
 */
async function findUnsupportedDirectories(
  pluginPath: string,
  fs: FsLike,
): Promise<string[]> {
  const unsupported: string[] = []

  try {
    const entries = await fs.readdir(pluginPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && !SUPPORTED_IN_CLAUDE.has(entry.name)) {
        // Check if this is a directory we care about (not hidden, not node_modules, etc.)
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          unsupported.push(entry.name)
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return unsupported
}

/**
 * Check if content references a specific directory
 */
function referencesDirectory(content: string, dirName: string): boolean {
  // Match patterns like: scripts/dist, rules/foo, templates/bar
  const pattern = new RegExp(`\\b${dirName}/`, 'g')
  return pattern.test(content)
}

async function scanMarkdownFile(
  filePath: string,
  pluginPath: string,
  unsupportedDirs: string[],
  fs: FsLike,
): Promise<string[]> {
  const warnings: string[] = []

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const relativePath = filePath.replace(pluginPath + '/', '')

    // Check for plugin-only patterns
    for (const { pattern, message } of PLUGIN_ONLY_PATTERNS) {
      if (pattern.test(content)) {
        warnings.push(`${relativePath} ${message}`)
        pattern.lastIndex = 0
      }
    }

    // Check for references to unsupported plugin directories
    for (const dir of unsupportedDirs) {
      if (referencesDirectory(content, dir)) {
        warnings.push(`${relativePath} references ${dir}/ (not installed to .claude)`)
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
  unsupportedDirs: string[],
  fs: FsLike,
): Promise<string[]> {
  const warnings: string[] = []

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        const subWarnings = await scanDirectory(fullPath, pluginPath, unsupportedDirs, fs)
        warnings.push(...subWarnings)
      } else if (entry.name.endsWith('.md')) {
        const fileWarnings = await scanMarkdownFile(fullPath, pluginPath, unsupportedDirs, fs)
        warnings.push(...fileWarnings)
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return warnings
}

export async function analyzePlugin(
  pluginPath: string,
  fs: FsLike = defaultFs,
): Promise<AnalysisResult> {
  const warnings: string[] = []

  // Find directories in plugin that won't be installed to .claude
  const unsupportedDirs = await findUnsupportedDirectories(pluginPath, fs)

  // Scan commands directory
  const commandsDir = join(pluginPath, 'commands')
  const commandWarnings = await scanDirectory(commandsDir, pluginPath, unsupportedDirs, fs)
  warnings.push(...commandWarnings)

  // Scan agents directory
  const agentsDir = join(pluginPath, 'agents')
  const agentWarnings = await scanDirectory(agentsDir, pluginPath, unsupportedDirs, fs)
  warnings.push(...agentWarnings)

  // Scan skills directory (skills/ is special - installed as-is)
  const skillsDir = join(pluginPath, 'skills')
  const skillWarnings = await scanDirectory(skillsDir, pluginPath, unsupportedDirs, fs)
  warnings.push(...skillWarnings)

  return {
    installable: warnings.length === 0,
    warnings,
  }
}
