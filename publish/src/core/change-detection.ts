export type GitRunner = (args: string[]) => Promise<string>

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function filterPostDirs(lines: string[], contentRoot: string): string[] {
  const root = contentRoot.replace(/\/$/, '')
  const prefix = root + '/'
  const indexRe = new RegExp(`^${escapeRegex(prefix)}([a-z]{2})/([^/]+)/index\\.md$`)
  const assetRe = new RegExp(`^${escapeRegex(prefix)}([a-z]{2})/([^/]+)/`)
  const dirs = new Set<string>()
  for (const line of lines) {
    const l = line.trim()
    if (!l) continue
    const indexMatch = l.match(indexRe)
    if (indexMatch) {
      const [, lang, slug] = indexMatch
      if (slug.startsWith('_')) continue
      dirs.add(`${prefix}${lang}/${slug}`)
      continue
    }
    const assetMatch = l.match(assetRe)
    if (assetMatch && !l.endsWith('.md')) {
      const [, lang, slug] = assetMatch
      if (slug.startsWith('_')) continue
      dirs.add(`${prefix}${lang}/${slug}`)
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
  for await (const langEntry of Deno.readDir(contentRoot)) {
    if (!langEntry.isDirectory) continue
    if (!/^[a-z]{2}$/.test(langEntry.name)) continue
    const langDir = `${contentRoot}/${langEntry.name}`
    for await (const postEntry of Deno.readDir(langDir)) {
      if (!postEntry.isDirectory) continue
      if (postEntry.name.startsWith('_')) continue
      const indexPath = `${langDir}/${postEntry.name}/index.md`
      try {
        const stat = await Deno.stat(indexPath)
        if (stat.isFile) result.push(`${langDir}/${postEntry.name}`)
      } catch {
        // skip folders without index.md
      }
    }
  }
  return result.sort()
}
