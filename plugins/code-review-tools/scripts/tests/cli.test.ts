import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { execSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import simpleGit, { type SimpleGit } from "simple-git"

const CLI_PATH = join(__dirname, "../dist/cli.js")
const PLUGIN_ROOT = join(__dirname, "../../")

let tempDir: string
let git: SimpleGit
let testCommits: string[] = []

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "cli-test-"))
  git = simpleGit(tempDir)
  await git.init()
  await git.addConfig("user.email", "test@example.com")
  await git.addConfig("user.name", "Test User")

  writeFileSync(join(tempDir, "file1.txt"), "initial content")
  await git.add("file1.txt")
  await git.commit("Initial commit")

  writeFileSync(join(tempDir, "file2.txt"), "file 2 content")
  await git.add("file2.txt")
  await git.commit("Add file2")

  writeFileSync(join(tempDir, "file3.txt"), "file 3 content")
  await git.add("file3.txt")
  await git.commit("Add file3")

  const log = await git.log()
  testCommits = log.all.map((c) => c.hash)
})

afterAll(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true })
  }
})

describe("CLI - prepare command", () => {
  test("shows error when commit hash is missing", () => {
    try {
      execSync(`node ${CLI_PATH} prepare --plugin-root ${PLUGIN_ROOT}`, {
        encoding: "utf-8",
      })
      throw new Error("Should have thrown")
    } catch (err: any) {
      expect(err.stderr).toContain("commit hash is required")
    }
  })

  test("shows error when plugin-root is missing", () => {
    try {
      execSync(`node ${CLI_PATH} prepare abc123`, {
        encoding: "utf-8",
      })
      throw new Error("Should have thrown")
    } catch (err: any) {
      expect(err.stderr).toContain("--plugin-root is required")
    }
  })

  test("prepares review data successfully", async () => {
    const startCommit = testCommits[1]

    const output = execSync(
      `node ${CLI_PATH} prepare ${startCommit} --plugin-root ${PLUGIN_ROOT}`,
      {
        encoding: "utf-8",
        cwd: tempDir,
      },
    )

    const result = JSON.parse(output)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.commits).toBeArray()
      expect(result.data.totalCommits).toBeNumber()
      expect(result.data.branch).toBeDefined()
      expect(result.data.commitRange).toContain("..")
      expect(result.data.rulesContent).toBeString()
      expect(result.data.reportTemplate).toBeString()
      expect(result.data.summaryTemplate).toBeString()
      expect(result.data.outputDirectory).toBeDefined()
      expect(result.data.maxConcurrentAgents).toBeNumber()
    }
  })

  test("returns correct commit count", async () => {
    const startCommit = testCommits[2]

    const output = execSync(
      `node ${CLI_PATH} prepare ${startCommit} --plugin-root ${PLUGIN_ROOT}`,
      {
        encoding: "utf-8",
        cwd: tempDir,
      },
    )

    const result = JSON.parse(output)

    expect(result.success).toBe(true)
    expect(result.data.totalCommits).toBe(3)
    expect(result.data.commitList).toHaveLength(3)
  })

  test("returns empty commits when at HEAD", async () => {
    const headCommit = testCommits[0]

    const output = execSync(
      `node ${CLI_PATH} prepare ${headCommit} --plugin-root ${PLUGIN_ROOT}`,
      {
        encoding: "utf-8",
        cwd: tempDir,
      },
    )

    const result = JSON.parse(output)

    expect(result.success).toBe(true)
    expect(result.data.totalCommits).toBe(1)
    expect(result.data.commits).toHaveLength(1)
  })

  test("uses default config values when no config file exists", async () => {
    const startCommit = testCommits[1]

    const output = execSync(
      `node ${CLI_PATH} prepare ${startCommit} --plugin-root ${PLUGIN_ROOT}`,
      {
        encoding: "utf-8",
        cwd: tempDir, // Temp dir has no .claude/code-review-tools/config.json
      },
    )

    const result = JSON.parse(output)

    expect(result.success).toBe(true)
    expect(result.data.maxConcurrentAgents).toBe(0)
    expect(result.data.outputDirectory).toBe(
      ".claude/code-review-tools/reports",
    )
    expect(result.data.rulesContent).toContain("Component Extraction")
    expect(result.data.rulesContent).toContain("Component Reuse")
    expect(result.data.rulesContent).toContain("AI Slop")
  })

  test("uses overridden config values when config file exists", async () => {
    const configDir = join(tempDir, ".claude/code-review-tools")
    const configPath = join(configDir, "config.json")

    execSync(`mkdir -p ${configDir}`, { cwd: tempDir })
    writeFileSync(
      configPath,
      JSON.stringify({
        builtInRules: {
          componentExtraction: false,
          componentReuse: true,
          aiSlop: false,
        },
        customRules: [],
        parallelization: {
          maxConcurrentAgents: 8,
        },
        reports: {
          outputDirectory: ".custom-reports",
        },
      }),
    )

    const startCommit = testCommits[1]

    const output = execSync(
      `node ${CLI_PATH} prepare ${startCommit} --plugin-root ${PLUGIN_ROOT}`,
      {
        encoding: "utf-8",
        cwd: tempDir,
      },
    )

    const result = JSON.parse(output)

    expect(result.success).toBe(true)
    expect(result.data.maxConcurrentAgents).toBe(8)
    expect(result.data.outputDirectory).toBe(".custom-reports")
    expect(result.data.rulesContent).not.toContain("Component Extraction")
    expect(result.data.rulesContent).toContain("Component Reuse")
    expect(result.data.rulesContent).not.toContain("AI Slop")

    rmSync(configPath)
  })
})

describe("CLI - help command", () => {
  test("shows usage with --help", () => {
    const output = execSync(`node ${CLI_PATH} --help`, {
      encoding: "utf-8",
    })

    expect(output).toContain("Code Review CLI")
    expect(output).toContain("prepare")
  })

  test("shows usage with -h", () => {
    const output = execSync(`node ${CLI_PATH} -h`, {
      encoding: "utf-8",
    })

    expect(output).toContain("Code Review CLI")
  })

  test("shows usage with no arguments", () => {
    const output = execSync(`node ${CLI_PATH}`, {
      encoding: "utf-8",
    })

    expect(output).toContain("Usage:")
  })
})

describe("CLI - error handling", () => {
  test("shows error for unknown command", () => {
    try {
      execSync(`node ${CLI_PATH} unknown-command`, {
        encoding: "utf-8",
      })
      throw new Error("Should have thrown")
    } catch (err: any) {
      expect(err.stderr).toContain("Unknown command")
    }
  })
})
