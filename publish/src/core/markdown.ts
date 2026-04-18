const IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+=\d+x\d+)?\)/g

function isAbsolute(url: string): boolean {
  return /^(https?:)?\/\//i.test(url)
}

export function rewriteImageUrls(md: string, mapping: Map<string, string>): string {
  return md.replace(IMG_RE, (full, alt: string, url: string) => {
    if (isAbsolute(url)) return full.replace(/\s+=\d+x\d+\)$/, ')')
    let decoded: string
    try {
      decoded = decodeURIComponent(url)
    } catch {
      decoded = url
    }
    const target = mapping.get(decoded) ?? mapping.get(url)
    if (!target) return full.replace(/\s+=\d+x\d+\)$/, ')')
    return `![${alt}](${target})`
  })
}

export function resolveCoverUrl(
  coverRaw: string | undefined,
  mapping: Map<string, string>,
): string | undefined {
  if (!coverRaw) return undefined
  if (isAbsolute(coverRaw)) return coverRaw
  return mapping.get(coverRaw)
}
