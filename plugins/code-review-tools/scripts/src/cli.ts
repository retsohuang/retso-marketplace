#!/usr/bin/env node

import {
  currentBranch,
  log,
  readCommit,
  type PromiseFsClient,
} from "isomorphic-git"
import * as nodeFs from "node:fs"
import { join } from "node:path"
import {
  DEFAULT_CONFIG,
  parseConfig,
  type ReviewConfig,
} from "./config-schema.js"

const DEFAULT_DIR = process.cwd()

interface FsLike extends PromiseFsClient {
  existsSync(path: string): boolean
  readFileSync(path: string, encoding: BufferEncoding): string
  writeFileSync(path: string, data: string): void
  mkdirSync(path: string, options?: { recursive?: boolean }): void
}

const defaultFs: FsLike = {
  promises: nodeFs.promises,
  existsSync: nodeFs.existsSync,
  readFileSync: nodeFs.readFileSync,
  writeFileSync: nodeFs.writeFileSync,
  mkdirSync: nodeFs.mkdirSync,
} as FsLike

interface SuccessOutput<T = unknown> {
  success: true
  data: T
}

interface ErrorOutput {
  success: false
  error: string
}

type Output<T = unknown> = SuccessOutput<T> | ErrorOutput

function success<T>(data: T): SuccessOutput<T> {
  return { success: true, data }
}

function error(message: string): ErrorOutput {
  return { success: false, error: message }
}

function loadConfig(
  configPath: string = ".claude/code-review-tools/config.json",
  fs: FsLike = defaultFs,
): Output<ReviewConfig> {
  try {
    if (!fs.existsSync(configPath)) {
      return success(DEFAULT_CONFIG)
    }

    const userConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"))
    const config = parseConfig(userConfig)

    return success(config)
  } catch (err) {
    return error(`Failed to load config: ${(err as Error).message}`)
  }
}

interface CommitInfo {
  hash: string
  author: string
  date: string
  subject: string
  body?: string
}

interface CollectCommitsResult {
  commits: CommitInfo[]
  branch: string
  commitRange: string
  totalCommits: number
}

async function collectCommits(
  commitHash: string,
  dir: string = DEFAULT_DIR,
  fs: FsLike = defaultFs,
): Promise<Output<CollectCommitsResult>> {
  try {
    const branch = (await currentBranch({ fs, dir })) ?? "HEAD"
    const allCommits = await log({ fs, dir, ref: "HEAD" })

    const targetIndex = allCommits.findIndex((c) =>
      c.oid.startsWith(commitHash),
    )
    if (targetIndex === -1) {
      return error(`Commit not found: ${commitHash}`)
    }

    const commitsInRange = allCommits.slice(0, targetIndex + 1)

    if (commitsInRange.length === 0) {
      return success({
        commits: [],
        branch,
        commitRange: `${commitHash}^..HEAD`,
        totalCommits: 0,
      })
    }

    const commits: CommitInfo[] = []
    for (const commitObj of commitsInRange) {
      const commitData = await readCommit({ fs, dir, oid: commitObj.oid })
      const message = commitData.commit.message
      const lines = message.split("\n")
      const subject = lines[0]
      const body = lines.slice(1).join("\n").trim() || undefined

      commits.push({
        hash: commitObj.oid,
        author: commitData.commit.author.name,
        date: new Date(commitData.commit.author.timestamp * 1000)
          .toISOString()
          .split("T")[0],
        subject,
        body,
      })
    }

    return success({
      commits: commits.reverse(),
      branch,
      commitRange: `${commitHash}^..HEAD`,
      totalCommits: commits.length,
    })
  } catch (err) {
    return error(`Failed to collect commits: ${(err as Error).message}`)
  }
}

interface BuildRulesResult {
  rulesContent: string
  enabledRulesCount: number
}

function buildRules(
  config: ReviewConfig,
  pluginRoot: string,
  fs: FsLike = defaultFs,
): Output<BuildRulesResult> {
  try {
    const rulesSections: string[] = []
    let enabledCount = 0

    const builtInRules = [
      {
        key: "componentExtraction" as const,
        file: "component-extraction-rules.md",
        name: "Component Extraction",
      },
      {
        key: "componentReuse" as const,
        file: "component-reuse-rules.md",
        name: "Component Reuse",
      },
      {
        key: "aiSlop" as const,
        file: "ai-slop-rules.md",
        name: "AI Slop",
      },
    ]

    for (const rule of builtInRules) {
      if (config.builtInRules?.[rule.key]) {
        const rulePath = join(pluginRoot, "rules", rule.file)
        if (fs.existsSync(rulePath)) {
          const content = fs.readFileSync(rulePath, "utf-8")
          rulesSections.push(`# ${rule.name} Rules\n\n${content}\n\n---\n`)
          enabledCount++
        }
      }
    }

    for (const rule of config.customRules ?? []) {
      if (rule.enabled) {
        const rulePath = `.claude/code-review-tools/rules/${rule.file}`
        if (fs.existsSync(rulePath)) {
          const content = fs.readFileSync(rulePath, "utf-8")
          rulesSections.push(`# ${rule.name} Rules\n\n${content}\n\n---\n`)
          enabledCount++
        } else {
          return error(`Custom rule file not found: ${rulePath}`)
        }
      }
    }

    if (rulesSections.length === 0) {
      return error("No rules enabled in config")
    }

    return success({
      rulesContent: rulesSections.join("\n"),
      enabledRulesCount: enabledCount,
    })
  } catch (err) {
    return error(`Failed to build rules: ${(err as Error).message}`)
  }
}

interface PrepareReviewResult {
  commits: CommitInfo[]
  commitList: string[]
  branch: string
  commitRange: string
  totalCommits: number
  rulesContent: string
  reportTemplate: string
  summaryTemplate: string
  outputDirectory: string
  maxConcurrentAgents: number
}

function loadTemplate(
  customTemplate: string | undefined,
  pluginRoot: string,
  defaultTemplateName: string,
  fs: FsLike = defaultFs,
): string {
  let templatePath: string

  if (customTemplate) {
    templatePath = `.claude/code-review-tools/templates/${customTemplate}`
  } else {
    templatePath = `${pluginRoot}/templates/${defaultTemplateName}`
  }

  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, "utf-8")
  }

  const defaultPath = `${pluginRoot}/templates/${defaultTemplateName}`
  if (fs.existsSync(defaultPath)) {
    console.error(`WARNING: Template not found: ${templatePath}, using default`)
    return fs.readFileSync(defaultPath, "utf-8")
  }

  throw new Error(`Template not found: ${defaultPath}`)
}

async function prepareReview(
  commitHash: string,
  pluginRoot: string,
  dir: string = DEFAULT_DIR,
  fs: FsLike = defaultFs,
): Promise<Output<PrepareReviewResult>> {
  try {
    const configResult = loadConfig(undefined, fs)
    if (!configResult.success) {
      return error(`Failed to load config: ${configResult.error}`)
    }
    const config = configResult.data

    const commitsResult = await collectCommits(commitHash, dir, fs)
    if (!commitsResult.success) {
      return error(`Failed to collect commits: ${commitsResult.error}`)
    }

    const rulesResult = buildRules(config, pluginRoot, fs)
    if (!rulesResult.success) {
      return error(`Failed to build rules: ${rulesResult.error}`)
    }

    const reportTemplate = loadTemplate(
      config.reports?.template,
      pluginRoot,
      "report-template.md",
      fs,
    )
    const summaryTemplate = loadTemplate(
      config.reports?.summaryTemplate,
      pluginRoot,
      "summary-template.md",
      fs,
    )

    return success({
      commits: commitsResult.data.commits,
      commitList: commitsResult.data.commits.map((c) => c.hash),
      branch: commitsResult.data.branch,
      commitRange: commitsResult.data.commitRange,
      totalCommits: commitsResult.data.totalCommits,
      rulesContent: rulesResult.data.rulesContent,
      reportTemplate,
      summaryTemplate,
      outputDirectory:
        config.reports?.outputDirectory ?? ".claude/code-review-tools/reports",
      maxConcurrentAgents: config.parallelization?.maxConcurrentAgents ?? 0,
    })
  } catch (err) {
    return error(`Failed to prepare review: ${(err as Error).message}`)
  }
}

function printUsage(): void {
  console.log(`
Code Review CLI (Internal)

Usage:
  cli.js prepare <commit-hash> --plugin-root <path>

Commands:
  prepare <commit-hash> --plugin-root <path>
    Prepare all data needed for code review

Examples:
  cli.js prepare abc123 --plugin-root /path/to/plugin
`)
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === "--plugin-root" && i + 1 < args.length) {
      parsed.pluginRoot = args[++i]
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true
    } else if (!arg.startsWith("--")) {
      if (!parsed.positional) {
        parsed.positional = arg
      }
    }
  }

  return parsed
}

export {
  buildRules,
  collectCommits,
  loadConfig,
  loadTemplate,
  prepareReview,
  type CollectCommitsResult,
  type CommitInfo,
  type FsLike,
  type Output,
  type PrepareReviewResult,
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage()
    process.exit(0)
  }

  const command = args[0]
  const parsedArgs = parseArgs(args.slice(1))

  try {
    switch (command) {
      case "prepare": {
        if (!parsedArgs.positional) {
          console.error("Error: commit hash is required")
          console.error(
            "Usage: cli.js prepare <commit-hash> --plugin-root <path>",
          )
          process.exit(1)
        }

        if (!parsedArgs.pluginRoot) {
          console.error("Error: --plugin-root is required")
          process.exit(1)
        }

        const result = await prepareReview(
          parsedArgs.positional as string,
          parsedArgs.pluginRoot as string,
        )

        if (!result.success) {
          console.error("Error:", result.error)
          process.exit(1)
        }

        console.log(JSON.stringify(result, null, 2))
        break
      }

      default:
        console.error(`Unknown command: ${command}`)
        console.error("Run with --help to see available commands")
        process.exit(1)
    }
  } catch (err) {
    console.error("Fatal error:", (err as Error).message)
    process.exit(1)
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  main().catch((err) => {
    console.error("Fatal error:", (err as Error).message)
    process.exit(1)
  })
}
