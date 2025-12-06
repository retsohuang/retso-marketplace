#!/usr/bin/env node

import { writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import { ReviewConfigSchema } from "./config-schema.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const jsonSchema = z.toJSONSchema(ReviewConfigSchema, {
  target: "draft-7",
  reused: "inline",
})

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Code Review Configuration",
  description:
    "Configuration for code-review-tools plugin custom rules and settings",
  ...jsonSchema,
}

const schemaPath = join(__dirname, "..", "..", "CONFIG-SCHEMA.json")
writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + "\n", "utf-8")

console.log("✅ Generated CONFIG-SCHEMA.json")
