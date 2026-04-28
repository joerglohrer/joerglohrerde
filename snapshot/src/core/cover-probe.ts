export interface ProbeResult {
  reachable: boolean
  status: number
}

export type HeadFetcher = (url: string) => Promise<{ ok: boolean; status: number }>

export const defaultHeadFetcher: HeadFetcher = async (url) => {
  const resp = await fetch(url, { method: 'HEAD' })
  return { ok: resp.ok, status: resp.status }
}

export async function probeCover(
  url: string,
  fetcher: HeadFetcher = defaultHeadFetcher,
): Promise<ProbeResult> {
  try {
    const r = await fetcher(url)
    return { reachable: r.ok, status: r.status }
  } catch {
    return { reachable: false, status: 0 }
  }
}
