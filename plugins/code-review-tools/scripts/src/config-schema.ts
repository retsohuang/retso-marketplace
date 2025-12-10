import { z } from "zod"

const RuleConfigSchema = z.object({
  name: z.string().min(1, "Rule name must not be empty"),
  file: z
    .string()
    .regex(
      /^[^/]+\.md$/,
      "Rule file must be a .md file in the rules directory",
    ),
  enabled: z.boolean().default(true),
})

export const ReviewConfigSchema = z.looseObject({
  builtInRules: z
    .object({
      componentExtraction: z.boolean(),
      componentReuse: z.boolean(),
      aiSlop: z.boolean(),
    })
    .optional(),
  customRules: z.array(RuleConfigSchema).optional(),
  parallelization: z
    .object({
      maxConcurrentAgents: z
        .number()
        .int()
        .min(0, "maxConcurrentAgents must be at least 0")
        .max(20, "maxConcurrentAgents must be at most 20"),
    })
    .optional(),
  reports: z
    .object({
      outputDirectory: z.string(),
      template: z
        .string()
        .regex(/^[^/]+\.md$/, "Template must be a .md file")
        .optional(),
      summaryTemplate: z
        .string()
        .regex(/^[^/]+\.md$/, "Summary template must be a .md file")
        .optional(),
    })
    .optional(),
})

export type ReviewConfig = z.infer<typeof ReviewConfigSchema>

export const DEFAULT_CONFIG: ReviewConfig = {
  builtInRules: {
    componentExtraction: true,
    componentReuse: true,
    aiSlop: true,
  },
  customRules: [],
  parallelization: {
    maxConcurrentAgents: 0,
  },
  reports: {
    outputDirectory: ".claude/code-review-tools/reports",
  },
}

export function parseConfig(input: unknown): ReviewConfig {
  const result = ReviewConfigSchema.safeParse(input)

  if (!result.success) {
    return DEFAULT_CONFIG
  }

  return {
    builtInRules: result.data.builtInRules
      ? {
          ...DEFAULT_CONFIG.builtInRules,
          ...result.data.builtInRules,
        }
      : DEFAULT_CONFIG.builtInRules,
    customRules: result.data.customRules ?? DEFAULT_CONFIG.customRules,
    parallelization: result.data.parallelization
      ? {
          ...DEFAULT_CONFIG.parallelization,
          ...result.data.parallelization,
        }
      : DEFAULT_CONFIG.parallelization,
    reports: result.data.reports
      ? {
          ...DEFAULT_CONFIG.reports,
          ...result.data.reports,
        }
      : DEFAULT_CONFIG.reports,
  }
}
