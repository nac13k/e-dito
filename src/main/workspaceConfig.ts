import { app } from 'electron'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const WORKSPACE_CONFIG_PATH = join(app.getPath('userData'), 'workspace.json')
const RECENT_WORKSPACES_LIMIT = 10

export type WorkspaceConfig = {
  lastWorkspacePath: string | null
  recentWorkspacePaths: string[]
  confirmExternalLinks: boolean
}

const normalizePath = (value: string) => value.trim()

const sanitizeRecent = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  const unique = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'string') {
      continue
    }
    const normalized = normalizePath(item)
    if (!normalized) {
      continue
    }
    unique.add(normalized)
    if (unique.size >= RECENT_WORKSPACES_LIMIT) {
      break
    }
  }

  return Array.from(unique)
}

const isDirectory = async (targetPath: string) => {
  try {
    const info = await stat(targetPath)
    return info.isDirectory()
  } catch {
    return false
  }
}

export const readWorkspaceConfig = async (): Promise<WorkspaceConfig> => {
  try {
    const raw = await readFile(WORKSPACE_CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<WorkspaceConfig>
    const lastWorkspacePath =
      typeof parsed.lastWorkspacePath === 'string' && parsed.lastWorkspacePath.trim().length > 0
        ? normalizePath(parsed.lastWorkspacePath)
        : null

    return {
      lastWorkspacePath,
      recentWorkspacePaths: sanitizeRecent(parsed.recentWorkspacePaths),
      confirmExternalLinks:
        typeof parsed.confirmExternalLinks === 'boolean' ? parsed.confirmExternalLinks : true,
    }
  } catch {
    return {
      lastWorkspacePath: null,
      recentWorkspacePaths: [],
      confirmExternalLinks: true,
    }
  }
}

export const writeWorkspaceConfig = async (config: WorkspaceConfig) => {
  await mkdir(dirname(WORKSPACE_CONFIG_PATH), { recursive: true })
  await writeFile(WORKSPACE_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export const getValidLastWorkspace = async () => {
  const config = await readWorkspaceConfig()
  if (!config.lastWorkspacePath) {
    return null
  }

  return (await isDirectory(config.lastWorkspacePath)) ? config.lastWorkspacePath : null
}

export const getValidRecentWorkspaces = async () => {
  const config = await readWorkspaceConfig()
  const validPaths: string[] = []

  for (const path of config.recentWorkspacePaths) {
    if (await isDirectory(path)) {
      validPaths.push(path)
    }
  }

  return validPaths
}

export const setLastWorkspacePath = async (workspacePath: string | null) => {
  const config = await readWorkspaceConfig()
  const nextPath = workspacePath && workspacePath.trim().length > 0 ? normalizePath(workspacePath) : null

  if (!nextPath) {
    const nextConfig: WorkspaceConfig = {
      ...config,
      lastWorkspacePath: null,
    }
    await writeWorkspaceConfig(nextConfig)
    return nextConfig
  }

  const nextRecent = [
    nextPath,
    ...config.recentWorkspacePaths.filter((path) => path !== nextPath),
  ].slice(0, RECENT_WORKSPACES_LIMIT)

  const nextConfig: WorkspaceConfig = {
    lastWorkspacePath: nextPath,
    recentWorkspacePaths: nextRecent,
    confirmExternalLinks: config.confirmExternalLinks,
  }

  await writeWorkspaceConfig(nextConfig)
  return nextConfig
}

export const clearWorkspaceHistory = async () => {
  const emptyConfig: WorkspaceConfig = {
    lastWorkspacePath: null,
    recentWorkspacePaths: [],
    confirmExternalLinks: true,
  }

  await writeWorkspaceConfig(emptyConfig)
  return emptyConfig
}

export const shouldConfirmExternalLinks = async () => {
  const config = await readWorkspaceConfig()
  return config.confirmExternalLinks
}

export const setConfirmExternalLinks = async (value: boolean) => {
  const config = await readWorkspaceConfig()
  const nextConfig: WorkspaceConfig = {
    ...config,
    confirmExternalLinks: value,
  }
  await writeWorkspaceConfig(nextConfig)
  return nextConfig
}
