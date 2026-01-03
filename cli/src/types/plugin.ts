import { z } from 'zod'

const AuthorSchema = z.object({
  name: z.string(),
  email: z.string().email(),
})

export const PluginManifestSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: AuthorSchema.optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  commands: z.array(z.string()).optional(),
  agents: z.array(z.string()).optional(),
})

export type PluginManifest = z.infer<typeof PluginManifestSchema>

export interface PluginWithContent {
  name: string
  description: string
  version: string
  commandCount: number
  agentCount: number
  skillCount: number
  getContent: () => Promise<ArrayBuffer>
}

export interface PluginMetadata {
  name: string
  description: string
  version: string
  commandCount: number
  agentCount: number
  skillCount: number
  file: string
}

export interface AnalysisResult {
  installable: boolean
  warnings: string[]
}

export interface TransformResult {
  commands: { source: string; target: string }[]
  agents: { source: string; target: string }[]
  skills: { source: string; target: string }[]
}

export interface InstalledItems {
  commands: string[]
  agents: string[]
  skills: string[]
}

export interface InstallResult {
  plugin: Pick<PluginWithContent, 'name' | 'description'>
  success: boolean
  targetPath: string
  installed?: InstalledItems
  movedToTrash?: boolean
  backupPath?: string
  error?: string
}

export interface PluginContents {
  commandCount: number
  agentCount: number
  skillCount: number
}

export interface ExistingPlugin {
  plugin: Pick<PluginWithContent, 'name' | 'description'>
  path: string
  contents?: PluginContents
}
