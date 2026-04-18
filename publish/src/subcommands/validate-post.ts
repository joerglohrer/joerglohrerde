import { parseFrontmatter } from '../core/frontmatter.ts'
import { validatePost } from '../core/validation.ts'

export interface ValidateResult {
  ok: boolean
  slug?: string
  error?: string
}

export async function validatePostFile(path: string): Promise<ValidateResult> {
  let text: string
  try {
    text = await Deno.readTextFile(path)
  } catch (err) {
    return { ok: false, error: `cannot read ${path}: ${err instanceof Error ? err.message : err}` }
  }
  try {
    const { fm } = parseFrontmatter(text)
    validatePost(fm)
    return { ok: true, slug: fm.slug }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
