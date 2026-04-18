import { assertEquals } from '@std/assert'
import { collectImages, mimeFromExt } from '../src/core/image-collector.ts'

Deno.test('mimeFromExt: erkennt gängige formate', () => {
  assertEquals(mimeFromExt('a.png'), 'image/png')
  assertEquals(mimeFromExt('a.jpg'), 'image/jpeg')
  assertEquals(mimeFromExt('a.jpeg'), 'image/jpeg')
  assertEquals(mimeFromExt('a.gif'), 'image/gif')
  assertEquals(mimeFromExt('a.webp'), 'image/webp')
  assertEquals(mimeFromExt('a.svg'), 'image/svg+xml')
})

Deno.test('collectImages: liest alle bild-dateien im ordner, ignoriert hugo-derivate', async () => {
  const tmp = await Deno.makeTempDir()
  try {
    await Deno.writeTextFile(`${tmp}/index.md`, '# hi')
    await Deno.writeFile(`${tmp}/a.png`, new Uint8Array([1]))
    await Deno.writeFile(`${tmp}/b.jpg`, new Uint8Array([2]))
    await Deno.writeFile(`${tmp}/a_hu_deadbeef.png`, new Uint8Array([3]))
    await Deno.writeTextFile(`${tmp}/notes.txt`, 'ignore me')
    const imgs = await collectImages(tmp)
    assertEquals(imgs.map((i) => i.fileName).sort(), ['a.png', 'b.jpg'])
    assertEquals(imgs.find((i) => i.fileName === 'a.png')?.mimeType, 'image/png')
  } finally {
    await Deno.remove(tmp, { recursive: true })
  }
})
