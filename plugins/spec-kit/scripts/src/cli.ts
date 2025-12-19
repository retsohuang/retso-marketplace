#!/usr/bin/env node

import { type PromiseFsClient } from "isomorphic-git"
import * as nodeFs from "node:fs"
import { join } from "node:path"

const DEFAULT_DIR = process.cwd()

interface FsLike extends PromiseFsClient {
  existsSync(path: string): boolean
  readFileSync(path: string, encoding: BufferEncoding): string
  writeFileSync(path: string, data: string): void
  mkdirSync(path: string, options?: { recursive?: boolean }): void
  readdirSync(path: string): string[]
}

const defaultFs: FsLike = {
  promises: nodeFs.promises,
  existsSync: nodeFs.existsSync,
  readFileSync: nodeFs.readFileSync,
  writeFileSync: nodeFs.writeFileSync,
  mkdirSync: nodeFs.mkdirSync,
  readdirSync: nodeFs.readdirSync,
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

interface InitResult {
  constitutionTemplate: string
  directories: string[]
}

function init(
  pluginRoot: string,
  dir: string = DEFAULT_DIR,
  fs: FsLike = defaultFs,
): Output<InitResult> {
  try {
    const specKitDir = join(dir, ".claude", "spec-kit")
    const memoryDir = join(specKitDir, "memory")
    const specsDir = join(specKitDir, "specs")

    const directories = [specKitDir, memoryDir, specsDir]
    for (const directory of directories) {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true })
      }
    }

    const templatePath = join(pluginRoot, "templates", "constitution-template.md")
    if (!fs.existsSync(templatePath)) {
      return error(`Constitution template not found: ${templatePath}`)
    }

    const constitutionTemplate = fs.readFileSync(templatePath, "utf-8")

    return success({
      constitutionTemplate,
      directories,
    })
  } catch (err) {
    return error(`Failed to initialize: ${(err as Error).message}`)
  }
}

interface CreateFeatureResult {
  specId: string
  featureDir: string
  featureNumber: number
}

function createFeature(
  shortName: string,
  pluginRoot: string,
  dir: string = DEFAULT_DIR,
  fs: FsLike = defaultFs,
): Output<CreateFeatureResult> {
  try {
    const specsDir = join(dir, ".claude", "spec-kit", "specs")

    if (!fs.existsSync(specsDir)) {
      return error("Spec-kit not initialized. Run: /spec-kit:init")
    }

    const entries = fs.readdirSync(specsDir)
    let maxNumber = 0

    for (const entry of entries) {
      const match = entry.match(/^(\d{3})-/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) {
          maxNumber = num
        }
      }
    }

    const nextNumber = maxNumber + 1
    const paddedNumber = nextNumber.toString().padStart(3, "0")

    const normalizedName = shortName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")

    const specId = `${paddedNumber}-${normalizedName}`
    const featureDir = join(specsDir, specId)

    if (fs.existsSync(featureDir)) {
      return error(`Feature directory already exists: ${featureDir}`)
    }

    fs.mkdirSync(featureDir, { recursive: true })
    fs.mkdirSync(join(featureDir, "checklists"), { recursive: true })

    const setResult = setCurrentSpec(specId, dir, fs)
    if (!setResult.success) {
      return error(`Failed to set current spec: ${setResult.error}`)
    }

    return success({
      specId,
      featureDir,
      featureNumber: nextNumber,
    })
  } catch (err) {
    return error(`Failed to create feature: ${(err as Error).message}`)
  }
}

interface Feature {
  number: number
  name: string
  directory: string
  artifacts: string[]
}

interface ListFeaturesResult {
  features: Feature[]
  totalFeatures: number
}

function listFeatures(
  dir: string = DEFAULT_DIR,
  fs: FsLike = defaultFs,
): Output<ListFeaturesResult> {
  try {
    const specsDir = join(dir, ".claude", "spec-kit", "specs")

    if (!fs.existsSync(specsDir)) {
      return success({
        features: [],
        totalFeatures: 0,
      })
    }

    const entries = fs.readdirSync(specsDir)
    const features: Feature[] = []

    for (const entry of entries) {
      const match = entry.match(/^(\d{3})-(.+)$/)
      if (match) {
        const number = parseInt(match[1], 10)
        const name = match[2]
        const directory = join(specsDir, entry)

        const artifacts: string[] = []
        const possibleArtifacts = [
          "spec.md",
          "plan.md",
          "tasks.md",
          "checklists",
        ]

        for (const artifact of possibleArtifacts) {
          const artifactPath = join(directory, artifact)
          if (fs.existsSync(artifactPath)) {
            artifacts.push(artifact)
          }
        }

        features.push({
          number,
          name,
          directory,
          artifacts,
        })
      }
    }

    features.sort((a, b) => a.number - b.number)

    return success({
      features,
      totalFeatures: features.length,
    })
  } catch (err) {
    return error(`Failed to list features: ${(err as Error).message}`)
  }
}

function template(
  templateName: string,
  pluginRoot: string,
  fs: FsLike = defaultFs,
): Output<string> {
  try {
    const templatePath = join(pluginRoot, "templates", `${templateName}.md`)

    if (!fs.existsSync(templatePath)) {
      return error(`Template not found: ${templateName}`)
    }

    const content = fs.readFileSync(templatePath, "utf-8")
    return success(content)
  } catch (err) {
    return error(`Failed to load template: ${(err as Error).message}`)
  }
}

interface Artifact {
  name: string
  path: string
  type: "file" | "directory"
}

interface ArtifactsResult {
  artifacts: Artifact[]
  featureDir: string
}

function artifacts(
  featureDir: string,
  fs: FsLike = defaultFs,
): Output<ArtifactsResult> {
  try {
    if (!fs.existsSync(featureDir)) {
      return error(`Feature directory not found: ${featureDir}`)
    }

    const entries = fs.readdirSync(featureDir)
    const artifacts: Artifact[] = []

    for (const entry of entries) {
      const fullPath = join(featureDir, entry)

      let isDirectory = false
      try {
        fs.readdirSync(fullPath)
        isDirectory = true
      } catch {
        // Not a directory
      }

      artifacts.push({
        name: entry,
        path: fullPath,
        type: isDirectory ? "directory" : "file",
      })
    }

    return success({
      artifacts,
      featureDir,
    })
  } catch (err) {
    return error(`Failed to list artifacts: ${(err as Error).message}`)
  }
}

interface GetCurrentSpecResult {
  currentSpec: string | null
  featureNumber?: number
  featureName?: string
  featureDir?: string
}

function getCurrentSpec(
  dir: string = DEFAULT_DIR,
  fs: FsLike = defaultFs,
): Output<GetCurrentSpecResult> {
  try {
    const progressPath = join(dir, ".claude", "spec-kit", "memory", "progress.yml")

    if (!fs.existsSync(progressPath)) {
      return success({ currentSpec: null })
    }

    const content = fs.readFileSync(progressPath, "utf-8")
    const match = content.match(/currentSpec:\s*"?([^"\n]+)"?/)

    if (!match || !match[1] || match[1] === "null" || match[1].trim() === "") {
      return success({ currentSpec: null })
    }

    const currentSpec = match[1].trim()
    const specMatch = currentSpec.match(/^(\d{3})-(.+)$/)

    if (!specMatch) {
      return success({ currentSpec: null })
    }

    const featureDir = join(dir, ".claude", "spec-kit", "specs", currentSpec)

    return success({
      currentSpec,
      featureNumber: parseInt(specMatch[1], 10),
      featureName: specMatch[2],
      featureDir: fs.existsSync(featureDir) ? featureDir : undefined,
    })
  } catch (err) {
    return error(`Failed to get current spec: ${(err as Error).message}`)
  }
}

interface SetCurrentSpecResult {
  currentSpec: string
  featureDir: string
}

function setCurrentSpec(
  specId: string,
  dir: string = DEFAULT_DIR,
  fs: FsLike = defaultFs,
): Output<SetCurrentSpecResult> {
  try {
    const specsDir = join(dir, ".claude", "spec-kit", "specs")
    const featureDir = join(specsDir, specId)

    if (!fs.existsSync(featureDir)) {
      return error(`Spec directory not found: ${featureDir}`)
    }

    const memoryDir = join(dir, ".claude", "spec-kit", "memory")
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true })
    }

    const progressPath = join(memoryDir, "progress.yml")
    fs.writeFileSync(progressPath, `currentSpec: "${specId}"\n`)

    return success({ currentSpec: specId, featureDir })
  } catch (err) {
    return error(`Failed to set current spec: ${(err as Error).message}`)
  }
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {}
  const positional: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === "--plugin-root" && i + 1 < args.length) {
      parsed.pluginRoot = args[++i]
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true
    } else if (!arg.startsWith("--")) {
      positional.push(arg)
    }
  }

  if (positional.length > 0) {
    parsed.positional = positional[0]
  }
  if (positional.length > 1) {
    parsed.positional2 = positional[1]
  }

  return parsed
}

function printUsage(): void {
  console.log(`
Spec-Kit CLI (Internal)

Usage:
  cli.js <command> [options]

Commands:
  init --plugin-root <path>
    Initialize project for spec-kit

  create-feature <short-name> --plugin-root <path>
    Create new feature with sequential numbering and set as current spec

  list-features [--plugin-root <path>]
    List all existing features

  template <template-name> --plugin-root <path>
    Load a template (constitution-template, spec-template, plan-template, tasks-template, checklist-template)

  artifacts <feature-dir>
    List artifacts in a feature directory

  get-current-spec
    Get the current working spec from progress.yml

  set-current-spec <spec-id>
    Set the current working spec in progress.yml (e.g., 001-user-auth)

Options:
  --plugin-root <path>    Path to plugin root directory
  --help, -h              Show this help message

Examples:
  cli.js init --plugin-root /path/to/plugin
  cli.js create-feature user-auth --plugin-root /path/to/plugin
  cli.js list-features
  cli.js template spec-template --plugin-root /path/to/plugin
  cli.js artifacts .claude/spec-kit/specs/001-user-auth
  cli.js get-current-spec
  cli.js set-current-spec 001-user-auth
`)
}

export {
  init,
  createFeature,
  listFeatures,
  template,
  artifacts,
  getCurrentSpec,
  setCurrentSpec,
  type FsLike,
  type Output,
  type InitResult,
  type CreateFeatureResult,
  type ListFeaturesResult,
  type ArtifactsResult,
  type GetCurrentSpecResult,
  type SetCurrentSpecResult,
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
      case "init": {
        if (!parsedArgs.pluginRoot) {
          console.error("Error: --plugin-root is required")
          process.exit(1)
        }

        const result = init(parsedArgs.pluginRoot as string)

        if (!result.success) {
          console.error("Error:", result.error)
          process.exit(1)
        }

        console.log(JSON.stringify(result, null, 2))
        break
      }

      case "create-feature": {
        if (!parsedArgs.positional) {
          console.error("Error: feature name is required")
          console.error("Usage: cli.js create-feature <short-name> --plugin-root <path>")
          process.exit(1)
        }

        if (!parsedArgs.pluginRoot) {
          console.error("Error: --plugin-root is required")
          process.exit(1)
        }

        const result = createFeature(
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

      case "list-features": {
        const result = listFeatures()

        if (!result.success) {
          console.error("Error:", result.error)
          process.exit(1)
        }

        console.log(JSON.stringify(result, null, 2))
        break
      }

      case "template": {
        if (!parsedArgs.positional) {
          console.error("Error: template name is required")
          console.error("Usage: cli.js template <template-name> --plugin-root <path>")
          process.exit(1)
        }

        if (!parsedArgs.pluginRoot) {
          console.error("Error: --plugin-root is required")
          process.exit(1)
        }

        const result = template(
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

      case "artifacts": {
        if (!parsedArgs.positional) {
          console.error("Error: feature directory is required")
          console.error("Usage: cli.js artifacts <feature-dir>")
          process.exit(1)
        }

        const result = artifacts(parsedArgs.positional as string)

        if (!result.success) {
          console.error("Error:", result.error)
          process.exit(1)
        }

        console.log(JSON.stringify(result, null, 2))
        break
      }

      case "get-current-spec": {
        const result = getCurrentSpec()

        if (!result.success) {
          console.error("Error:", result.error)
          process.exit(1)
        }

        console.log(JSON.stringify(result, null, 2))
        break
      }

      case "set-current-spec": {
        if (!parsedArgs.positional) {
          console.error("Error: spec ID is required")
          console.error("Usage: cli.js set-current-spec <spec-id>")
          process.exit(1)
        }

        const result = setCurrentSpec(parsedArgs.positional as string)

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
