import { assertEquals } from '@std/assert'
import {
  changedPostDirs,
  filterPostDirs,
  type GitRunner,
} from '../src/core/change-detection.ts'

Deno.test('filterPostDirs: extrahiert post-ordner aus dateipfaden (content/posts)', () => {
  const lines = [
    'content/posts/a/index.md',
    'content/posts/b/image.png',
    'content/posts/c/other.md',
    'README.md',
    'app/src/lib/x.ts',
  ]
  assertEquals(
    filterPostDirs(lines, 'content/posts').sort(),
    ['content/posts/a', 'content/posts/b'],
  )
})

Deno.test('filterPostDirs: respektiert alternativen root (blog/)', () => {
  const lines = [
    'blog/x/index.md',
    'blog/y/pic.png',
    'content/posts/z/index.md',
    'README.md',
  ]
  assertEquals(filterPostDirs(lines, 'blog').sort(), ['blog/x', 'blog/y'])
})

Deno.test('filterPostDirs: ignoriert _drafts und non-index.md', () => {
  const lines = [
    'content/posts/a/index.md',
    'content/posts/a/extra.md',
    'content/posts/_drafts/x/index.md',
  ]
  assertEquals(filterPostDirs(lines, 'content/posts'), ['content/posts/a'])
})

Deno.test('changedPostDirs: nutzt git diff --name-only A..B', async () => {
  const runner: GitRunner = (args) => {
    assertEquals(args[0], 'diff')
    assertEquals(args[1], '--name-only')
    assertEquals(args[2], 'HEAD~1..HEAD')
    return Promise.resolve('content/posts/x/index.md\nREADME.md\n')
  }
  const dirs = await changedPostDirs({
    from: 'HEAD~1',
    to: 'HEAD',
    contentRoot: 'content/posts',
    runner,
  })
  assertEquals(dirs, ['content/posts/x'])
})

Deno.test('filterPostDirs: extrahiert post-ordner mit sprach-ebene', () => {
  const lines = [
    'content/posts/de/a/index.md',
    'content/posts/en/b/image.png',
    'content/posts/de/c/index.md',
    'README.md',
  ]
  assertEquals(
    filterPostDirs(lines, 'content/posts').sort(),
    ['content/posts/de/a', 'content/posts/de/c', 'content/posts/en/b'],
  )
})

Deno.test('filterPostDirs: ignoriert dateien direkt unter lang-ordner', () => {
  const lines = [
    'content/posts/de/index.md',
    'content/posts/de/README.md',
    'content/posts/de/x/index.md',
  ]
  assertEquals(filterPostDirs(lines, 'content/posts'), ['content/posts/de/x'])
})

Deno.test('filterPostDirs: _drafts unter sprach-ebene wird ignoriert', () => {
  const lines = [
    'content/posts/de/_drafts/x/index.md',
    'content/posts/de/real/index.md',
  ]
  assertEquals(filterPostDirs(lines, 'content/posts'), ['content/posts/de/real'])
})
