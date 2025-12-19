#!/usr/bin/env node

// src/cli.ts
import * as nodeFs from "node:fs";
import { join } from "node:path";
var DEFAULT_DIR = process.cwd();
var defaultFs = {
  promises: nodeFs.promises,
  existsSync: nodeFs.existsSync,
  readFileSync: nodeFs.readFileSync,
  writeFileSync: nodeFs.writeFileSync,
  mkdirSync: nodeFs.mkdirSync,
  readdirSync: nodeFs.readdirSync
};
function success(data) {
  return { success: true, data };
}
function error(message) {
  return { success: false, error: message };
}
function init(pluginRoot, dir = DEFAULT_DIR, fs = defaultFs) {
  try {
    const specKitDir = join(dir, ".claude", "spec-kit");
    const memoryDir = join(specKitDir, "memory");
    const specsDir = join(specKitDir, "specs");
    const directories = [specKitDir, memoryDir, specsDir];
    for (const directory of directories) {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
    }
    const templatePath = join(pluginRoot, "templates", "constitution-template.md");
    if (!fs.existsSync(templatePath)) {
      return error(`Constitution template not found: ${templatePath}`);
    }
    const constitutionTemplate = fs.readFileSync(templatePath, "utf-8");
    return success({
      constitutionTemplate,
      directories
    });
  } catch (err) {
    return error(`Failed to initialize: ${err.message}`);
  }
}
function createFeature(shortName, pluginRoot, dir = DEFAULT_DIR, fs = defaultFs) {
  try {
    const specsDir = join(dir, ".claude", "spec-kit", "specs");
    if (!fs.existsSync(specsDir)) {
      return error("Spec-kit not initialized. Run: /spec-kit:init");
    }
    const entries = fs.readdirSync(specsDir);
    let maxNumber = 0;
    for (const entry of entries) {
      const match = entry.match(/^(\d{3})-/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    const nextNumber = maxNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(3, "0");
    const normalizedName = shortName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const specId = `${paddedNumber}-${normalizedName}`;
    const featureDir = join(specsDir, specId);
    if (fs.existsSync(featureDir)) {
      return error(`Feature directory already exists: ${featureDir}`);
    }
    fs.mkdirSync(featureDir, { recursive: true });
    fs.mkdirSync(join(featureDir, "checklists"), { recursive: true });
    const setResult = setCurrentSpec(specId, dir, fs);
    if (!setResult.success) {
      return error(`Failed to set current spec: ${setResult.error}`);
    }
    return success({
      specId,
      featureDir,
      featureNumber: nextNumber
    });
  } catch (err) {
    return error(`Failed to create feature: ${err.message}`);
  }
}
function listFeatures(dir = DEFAULT_DIR, fs = defaultFs) {
  try {
    const specsDir = join(dir, ".claude", "spec-kit", "specs");
    if (!fs.existsSync(specsDir)) {
      return success({
        features: [],
        totalFeatures: 0
      });
    }
    const entries = fs.readdirSync(specsDir);
    const features = [];
    for (const entry of entries) {
      const match = entry.match(/^(\d{3})-(.+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        const name = match[2];
        const directory = join(specsDir, entry);
        const artifacts = [];
        const possibleArtifacts = [
          "spec.md",
          "plan.md",
          "tasks.md",
          "checklists"
        ];
        for (const artifact of possibleArtifacts) {
          const artifactPath = join(directory, artifact);
          if (fs.existsSync(artifactPath)) {
            artifacts.push(artifact);
          }
        }
        features.push({
          number,
          name,
          directory,
          artifacts
        });
      }
    }
    features.sort((a, b) => a.number - b.number);
    return success({
      features,
      totalFeatures: features.length
    });
  } catch (err) {
    return error(`Failed to list features: ${err.message}`);
  }
}
function template(templateName, pluginRoot, fs = defaultFs) {
  try {
    const templatePath = join(pluginRoot, "templates", `${templateName}.md`);
    if (!fs.existsSync(templatePath)) {
      return error(`Template not found: ${templateName}`);
    }
    const content = fs.readFileSync(templatePath, "utf-8");
    return success(content);
  } catch (err) {
    return error(`Failed to load template: ${err.message}`);
  }
}
function artifacts(featureDir, fs = defaultFs) {
  try {
    if (!fs.existsSync(featureDir)) {
      return error(`Feature directory not found: ${featureDir}`);
    }
    const entries = fs.readdirSync(featureDir);
    const artifacts2 = [];
    for (const entry of entries) {
      const fullPath = join(featureDir, entry);
      let isDirectory = false;
      try {
        fs.readdirSync(fullPath);
        isDirectory = true;
      } catch {}
      artifacts2.push({
        name: entry,
        path: fullPath,
        type: isDirectory ? "directory" : "file"
      });
    }
    return success({
      artifacts: artifacts2,
      featureDir
    });
  } catch (err) {
    return error(`Failed to list artifacts: ${err.message}`);
  }
}
function getCurrentSpec(dir = DEFAULT_DIR, fs = defaultFs) {
  try {
    const progressPath = join(dir, ".claude", "spec-kit", "memory", "progress.yml");
    if (!fs.existsSync(progressPath)) {
      return success({ currentSpec: null });
    }
    const content = fs.readFileSync(progressPath, "utf-8");
    const match = content.match(/currentSpec:\s*"?([^"\n]+)"?/);
    if (!match || !match[1] || match[1] === "null" || match[1].trim() === "") {
      return success({ currentSpec: null });
    }
    const currentSpec = match[1].trim();
    const specMatch = currentSpec.match(/^(\d{3})-(.+)$/);
    if (!specMatch) {
      return success({ currentSpec: null });
    }
    const featureDir = join(dir, ".claude", "spec-kit", "specs", currentSpec);
    return success({
      currentSpec,
      featureNumber: parseInt(specMatch[1], 10),
      featureName: specMatch[2],
      featureDir: fs.existsSync(featureDir) ? featureDir : undefined
    });
  } catch (err) {
    return error(`Failed to get current spec: ${err.message}`);
  }
}
function setCurrentSpec(specId, dir = DEFAULT_DIR, fs = defaultFs) {
  try {
    const specsDir = join(dir, ".claude", "spec-kit", "specs");
    const featureDir = join(specsDir, specId);
    if (!fs.existsSync(featureDir)) {
      return error(`Spec directory not found: ${featureDir}`);
    }
    const memoryDir = join(dir, ".claude", "spec-kit", "memory");
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    const progressPath = join(memoryDir, "progress.yml");
    fs.writeFileSync(progressPath, `currentSpec: "${specId}"
`);
    return success({ currentSpec: specId, featureDir });
  } catch (err) {
    return error(`Failed to set current spec: ${err.message}`);
  }
}
function parseArgs(args) {
  const parsed = {};
  const positional = [];
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    if (arg === "--plugin-root" && i + 1 < args.length) {
      parsed.pluginRoot = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (!arg.startsWith("--")) {
      positional.push(arg);
    }
  }
  if (positional.length > 0) {
    parsed.positional = positional[0];
  }
  if (positional.length > 1) {
    parsed.positional2 = positional[1];
  }
  return parsed;
}
function printUsage() {
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
`);
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }
  const command = args[0];
  const parsedArgs = parseArgs(args.slice(1));
  try {
    switch (command) {
      case "init": {
        if (!parsedArgs.pluginRoot) {
          console.error("Error: --plugin-root is required");
          process.exit(1);
        }
        const result = init(parsedArgs.pluginRoot);
        if (!result.success) {
          console.error("Error:", result.error);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "create-feature": {
        if (!parsedArgs.positional) {
          console.error("Error: feature name is required");
          console.error("Usage: cli.js create-feature <short-name> --plugin-root <path>");
          process.exit(1);
        }
        if (!parsedArgs.pluginRoot) {
          console.error("Error: --plugin-root is required");
          process.exit(1);
        }
        const result = createFeature(parsedArgs.positional, parsedArgs.pluginRoot);
        if (!result.success) {
          console.error("Error:", result.error);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "list-features": {
        const result = listFeatures();
        if (!result.success) {
          console.error("Error:", result.error);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "template": {
        if (!parsedArgs.positional) {
          console.error("Error: template name is required");
          console.error("Usage: cli.js template <template-name> --plugin-root <path>");
          process.exit(1);
        }
        if (!parsedArgs.pluginRoot) {
          console.error("Error: --plugin-root is required");
          process.exit(1);
        }
        const result = template(parsedArgs.positional, parsedArgs.pluginRoot);
        if (!result.success) {
          console.error("Error:", result.error);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "artifacts": {
        if (!parsedArgs.positional) {
          console.error("Error: feature directory is required");
          console.error("Usage: cli.js artifacts <feature-dir>");
          process.exit(1);
        }
        const result = artifacts(parsedArgs.positional);
        if (!result.success) {
          console.error("Error:", result.error);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "get-current-spec": {
        const result = getCurrentSpec();
        if (!result.success) {
          console.error("Error:", result.error);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "set-current-spec": {
        if (!parsedArgs.positional) {
          console.error("Error: spec ID is required");
          console.error("Usage: cli.js set-current-spec <spec-id>");
          process.exit(1);
        }
        const result = setCurrentSpec(parsedArgs.positional);
        if (!result.success) {
          console.error("Error:", result.error);
          process.exit(1);
        }
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run with --help to see available commands");
        process.exit(1);
    }
  } catch (err) {
    console.error("Fatal error:", err.message);
    process.exit(1);
  }
}
if (import.meta.url.endsWith(process.argv[1])) {
  main().catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
  });
}
export {
  template,
  setCurrentSpec,
  listFeatures,
  init,
  getCurrentSpec,
  createFeature,
  artifacts
};
