import { assertEquals } from '@std/assert'
import { probeCover, type HeadFetcher } from '../src/core/cover-probe.ts'

Deno.test('probeCover: 200 -> reachable=true', async () => {
  const fetcher: HeadFetcher = async () => ({ ok: true, status: 200 })
  const r = await probeCover('https://blossom.example/abc.jpg', fetcher)
  assertEquals(r, { reachable: true, status: 200 })
})

Deno.test('probeCover: 404 -> reachable=false', async () => {
  const fetcher: HeadFetcher = async () => ({ ok: false, status: 404 })
  const r = await probeCover('https://blossom.example/abc.jpg', fetcher)
  assertEquals(r, { reachable: false, status: 404 })
})

Deno.test('probeCover: network error -> reachable=false', async () => {
  const fetcher: HeadFetcher = async () => {
    throw new Error('ECONNREFUSED')
  }
  const r = await probeCover('https://blossom.example/abc.jpg', fetcher)
  assertEquals(r, { reachable: false, status: 0 })
})
