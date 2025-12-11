import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { add, commit, init, setConfig } from "isomorphic-git"
import { Volume, createFsFromVolume } from "memfs"
import { join } from "node:path"
import {
  collectCommits,
  loadConfig,
  prepareReview,
  type FsLike,
} from "../src/cli.js"

const PLUGIN_ROOT = join(__dirname, "../../")

let fs: FsLike
let vol: Volume
let testCommits: string[] = []
const TEST_DIR = "/repo"

beforeEach(async () => {
  vol = new Volume()
  const memfsInstance = createFsFromVolume(vol)

  // Create FsLike by combining memfs with sync methods
  fs = {
    promises: memfsInstance.promises,
    existsSync: memfsInstance.existsSync.bind(memfsInstance),
    readFileSync: memfsInstance.readFileSync.bind(memfsInstance),
    writeFileSync: memfsInstance.writeFileSync.bind(memfsInstance),
    mkdirSync: memfsInstance.mkdirSync.bind(memfsInstance),
  } as FsLike

  vol.mkdirSync(TEST_DIR, { recursive: true })

  await init({ fs, dir: TEST_DIR, defaultBranch: "main" })
  await setConfig({
    fs,
    dir: TEST_DIR,
    path: "user.email",
    value: "test@example.com",
  })
  await setConfig({ fs, dir: TEST_DIR, path: "user.name", value: "Test User" })
  fs.writeFileSync(join(TEST_DIR, "file1.txt"), "initial content")
  await add({ fs, dir: TEST_DIR, filepath: "file1.txt" })
  const commit1 = await commit({
    fs,
    dir: TEST_DIR,
    message: "Initial commit",
    author: { name: "Test User", email: "test@example.com" },
  })

  fs.writeFileSync(join(TEST_DIR, "file2.txt"), "file 2 content")
  await add({ fs, dir: TEST_DIR, filepath: "file2.txt" })
  const commit2 = await commit({
    fs,
    dir: TEST_DIR,
    message: "Add file2",
    author: { name: "Test User", email: "test@example.com" },
  })

  fs.writeFileSync(join(TEST_DIR, "file3.txt"), "file 3 content")
  await add({ fs, dir: TEST_DIR, filepath: "file3.txt" })
  const commit3 = await commit({
    fs,
    dir: TEST_DIR,
    message: "Add file3",
    author: { name: "Test User", email: "test@example.com" },
  })

  testCommits = [commit3, commit2, commit1]

  const pluginRulesDir = join(PLUGIN_ROOT, "rules")
  const pluginTemplatesDir = join(PLUGIN_ROOT, "templates")

  fs.mkdirSync(pluginRulesDir, { recursive: true })
  fs.mkdirSync(pluginTemplatesDir, { recursive: true })

  fs.writeFileSync(
    join(pluginRulesDir, "component-extraction-rules.md"),
    "# Component Extraction Rules\nVerify component extraction.",
  )
  fs.writeFileSync(
    join(pluginRulesDir, "component-reuse-rules.md"),
    "# Component Reuse Rules\nCheck for reuse opportunities.",
  )
  fs.writeFileSync(
    join(pluginRulesDir, "ai-slop-rules.md"),
    "# AI Slop Rules\nDetect AI patterns.",
  )

  fs.writeFileSync(
    join(pluginTemplatesDir, "report-template.md"),
    "# Report Template\n{commitRange}",
  )
  fs.writeFileSync(
    join(pluginTemplatesDir, "summary-template.md"),
    "# Summary Template\n{commits}",
  )
})

afterEach(() => {
  vol.reset()
})

describe("collectCommits", () => {
  test("collects commits from start hash to HEAD", async () => {
    const startCommit = testCommits[1].slice(0, 7)

    const result = await collectCommits(startCommit, TEST_DIR, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalCommits).toBe(2)
      expect(result.data.commits).toHaveLength(2)
      expect(result.data.branch).toBe("main")
      expect(result.data.commitRange).toContain("..")
    }
  })

  test("returns all commits when using oldest commit", async () => {
    const startCommit = testCommits[2].slice(0, 7)

    const result = await collectCommits(startCommit, TEST_DIR, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalCommits).toBe(3)
      expect(result.data.commits).toHaveLength(3)
    }
  })

  test("returns single commit when at HEAD", async () => {
    const headCommit = testCommits[0].slice(0, 7)

    const result = await collectCommits(headCommit, TEST_DIR, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalCommits).toBe(1)
      expect(result.data.commits).toHaveLength(1)
      expect(result.data.commits[0].subject).toBe("Add file3")
    }
  })

  test("returns error for invalid commit hash", async () => {
    const result = await collectCommits("invalid-hash", TEST_DIR, fs)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain("Commit not found")
    }
  })

  test("includes commit metadata", async () => {
    const startCommit = testCommits[1].slice(0, 7)

    const result = await collectCommits(startCommit, TEST_DIR, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      const commitInfo = result.data.commits[0]
      expect(commitInfo.hash).toBeDefined()
      expect(commitInfo.author).toBe("Test User")
      expect(commitInfo.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(commitInfo.subject).toBeDefined()
    }
  })

  test("collects commits when called from a subdirectory", async () => {
    const subDir = join(TEST_DIR, "packages/app")
    fs.mkdirSync(subDir, { recursive: true })

    const startCommit = testCommits[1].slice(0, 7)
    const result = await collectCommits(startCommit, subDir, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalCommits).toBe(2)
      expect(result.data.commits).toHaveLength(2)
      expect(result.data.branch).toBe("main")
    }
  })
})

describe("loadConfig", () => {
  test("returns default config when no config file exists", () => {
    const result = loadConfig(undefined, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.builtInRules?.componentExtraction).toBe(true)
      expect(result.data.builtInRules?.componentReuse).toBe(true)
      expect(result.data.builtInRules?.aiSlop).toBe(true)
      expect(result.data.parallelization?.maxConcurrentAgents).toBe(0)
    }
  })

  test("loads custom config when file exists", () => {
    const configDir = join(TEST_DIR, ".claude/code-review-tools")
    const configPath = join(configDir, "config.json")

    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        builtInRules: {
          componentExtraction: false,
          componentReuse: true,
          aiSlop: false,
        },
        parallelization: {
          maxConcurrentAgents: 5,
        },
      }),
    )

    const result = loadConfig(configPath, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.builtInRules?.componentExtraction).toBe(false)
      expect(result.data.builtInRules?.componentReuse).toBe(true)
      expect(result.data.builtInRules?.aiSlop).toBe(false)
      expect(result.data.parallelization?.maxConcurrentAgents).toBe(5)
    }
  })

  test("handles invalid JSON gracefully", () => {
    const configPath = join(TEST_DIR, "invalid-config.json")
    fs.writeFileSync(configPath, "{ invalid json }")

    const result = loadConfig(configPath, fs)

    expect(result.success).toBe(false)
  })
})

describe("prepareReview", () => {
  test("prepares review data successfully with default config", async () => {
    const startCommit = testCommits[1].slice(0, 7)

    const result = await prepareReview(startCommit, PLUGIN_ROOT, TEST_DIR, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.commits).toBeArray()
      expect(result.data.totalCommits).toBeNumber()
      expect(result.data.branch).toBeDefined()
      expect(result.data.commitRange).toContain("..")
      expect(result.data.rulesContent).toContain("Component Extraction")
      expect(result.data.rulesContent).toContain("Component Reuse")
      expect(result.data.rulesContent).toContain("AI Slop")
      expect(result.data.reportTemplate).toContain("Report Template")
      expect(result.data.summaryTemplate).toContain("Summary Template")
      expect(result.data.outputDirectory).toBe(
        ".claude/code-review-tools/reports",
      )
      expect(result.data.maxConcurrentAgents).toBe(0)
    }
  })

  test("respects custom config when provided", async () => {
    const configDir = ".claude/code-review-tools"
    const configPath = join(configDir, "config.json")

    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        builtInRules: {
          componentExtraction: false,
          componentReuse: true,
          aiSlop: false,
        },
        parallelization: {
          maxConcurrentAgents: 8,
        },
        reports: {
          outputDirectory: ".custom-reports",
        },
      }),
    )

    const startCommit = testCommits[1].slice(0, 7)

    const result = await prepareReview(startCommit, PLUGIN_ROOT, TEST_DIR, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.maxConcurrentAgents).toBe(8)
      expect(result.data.outputDirectory).toBe(".custom-reports")
      expect(result.data.rulesContent).not.toContain("Component Extraction")
      expect(result.data.rulesContent).toContain("Component Reuse")
      expect(result.data.rulesContent).not.toContain("AI Slop")
    }
  })

  test("returns correct commit list", async () => {
    const startCommit = testCommits[2].slice(0, 7)

    const result = await prepareReview(startCommit, PLUGIN_ROOT, TEST_DIR, fs)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.commitList).toHaveLength(3)
      expect(result.data.totalCommits).toBe(3)
    }
  })

  test("returns error for invalid commit", async () => {
    const result = await prepareReview("invalid", PLUGIN_ROOT, TEST_DIR, fs)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain("Commit not found")
    }
  })
})

describe("CLI integration (help commands)", () => {
  test("CLI exports are available", () => {
    expect(prepareReview).toBeDefined()
    expect(collectCommits).toBeDefined()
    expect(loadConfig).toBeDefined()
  })
})
