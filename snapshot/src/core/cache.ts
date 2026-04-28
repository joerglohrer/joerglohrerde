export interface CacheState {
  lastKnownGoodCount: number
  deletedCoords: string[]
}

export async function readCache(path: string): Promise<CacheState | undefined> {
  try {
    const text = await Deno.readTextFile(path)
    return JSON.parse(text) as CacheState
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return undefined
    throw err
  }
}

export async function writeCache(path: string, state: CacheState): Promise<void> {
  await Deno.writeTextFile(path, JSON.stringify(state, null, 2) + '\n')
}
