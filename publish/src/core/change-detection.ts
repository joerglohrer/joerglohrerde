export type GitRunner = (args: string[]) => Promise<string>

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function filterPostDirs(lines: string[], contentRoot: string): string[] {
  const root = contentRoot.replace(/\/$/, '')
  const prefix = root + '/'
  const indexRe = new RegExp(`^${escapeRegex(prefix)}([^/]+)/index\\.md$`)
  const assetRe = new RegExp(`^${escapeRegex(prefix)}([^/]+)/`)
  const drafts = prefix + '_'
  const dirs = new Set<string>()
  for (const line of lines) {
    const l = line.trim()
    if (!l) continue
    if (l.startsWith(drafts)) continue
    const indexMatch = l.match(indexRe)
    if (indexMatch) {
      dirs.add(`${prefix}${indexMatch[1]}`)
      continue
    }
    const assetMatch = l.match(assetRe)
    if (assetMatch && !l.endsWith('.md')) {
      dirs.add(`${prefix}${assetMatch[1]}`)
    }
  }
  return [...dirs].sort()
}

const defaultRunner: GitRunner = async (args) => {
  const proc = new Deno.Command('git', { args, stdout: 'piped', stderr: 'piped' })
  const out = await proc.output()
  if (out.code !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${new TextDecoder().decode(out.stderr)}`)
  }
  return new TextDecoder().decode(out.stdout)
}

export interface DiffArgs {
  from: string
  to: string
  contentRoot: string
  runner?: GitRunner
}

export async function changedPostDirs(args: DiffArgs): Promise<string[]> {
  const runner = args.runner ?? defaultRunner
  const stdout = await runner(['diff', '--name-only', `${args.from}..${args.to}`])
  return filterPostDirs(stdout.split('\n'), args.contentRoot)
}

export async function allPostDirs(contentRoot: string): Promise<string[]> {
  const result: string[] = []
  for await (const entry of Deno.readDir(contentRoot)) {
    if (entry.isDirectory && !entry.name.startsWith('_')) {
      const indexPath = `${contentRoot}/${entry.name}/index.md`
      try {
        const stat = await Deno.stat(indexPath)
        if (stat.isFile) result.push(`${contentRoot}/${entry.name}`)
      } catch {
        // skip folders without index.md
      }
    }
  }
  return result.sort()
}
