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
