import { assertEquals } from '@std/assert'
import { rewriteImageUrls } from '../src/core/markdown.ts'

Deno.test('rewriteImageUrls: ersetzt ![alt](file) durch Mapping', () => {
  const mapping = new Map([['cat.png', 'https://blossom.example/hash.png']])
  const input = '![cat](cat.png)'
  assertEquals(rewriteImageUrls(input, mapping), '![cat](https://blossom.example/hash.png)')
})

Deno.test('rewriteImageUrls: absolute URL bleibt unverändert', () => {
  const mapping = new Map([['cat.png', 'https://blossom.example/hash.png']])
  const input = '![cat](https://other.com/cat.png)'
  assertEquals(rewriteImageUrls(input, mapping), input)
})

Deno.test('rewriteImageUrls: entfernt =WxH-Suffix', () => {
  const mapping = new Map([['cat.png', 'https://blossom.example/hash.png']])
  const input = '![cat](cat.png =300x200)'
  assertEquals(rewriteImageUrls(input, mapping), '![cat](https://blossom.example/hash.png)')
})

Deno.test('rewriteImageUrls: bild-in-link [![alt](file)](link)', () => {
  const mapping = new Map([['cat.png', 'https://blossom.example/hash.png']])
  const input = '[![cat](cat.png)](https://target.example.com)'
  assertEquals(
    rewriteImageUrls(input, mapping),
    '[![cat](https://blossom.example/hash.png)](https://target.example.com)',
  )
})

Deno.test('rewriteImageUrls: mehrere Bilder im Text', () => {
  const mapping = new Map([
    ['a.png', 'https://bl/a-hash.png'],
    ['b.jpg', 'https://bl/b-hash.jpg'],
  ])
  const input = 'Text ![a](a.png) more ![b](b.jpg) end'
  assertEquals(
    rewriteImageUrls(input, mapping),
    'Text ![a](https://bl/a-hash.png) more ![b](https://bl/b-hash.jpg) end',
  )
})

Deno.test('rewriteImageUrls: lässt unbekannte Dateinamen stehen', () => {
  const mapping = new Map([['cat.png', 'https://bl/c.png']])
  const input = '![x](missing.jpg)'
  assertEquals(rewriteImageUrls(input, mapping), input)
})

Deno.test('rewriteImageUrls: URL-Dekodierung für Leerzeichen-Namen', () => {
  const mapping = new Map([['file with spaces.png', 'https://bl/hash.png']])
  const input = '![x](file%20with%20spaces.png)'
  assertEquals(rewriteImageUrls(input, mapping), '![x](https://bl/hash.png)')
})
