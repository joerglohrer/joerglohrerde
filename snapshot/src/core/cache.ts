export interface CacheState {
  lastKnownGoodCount: number
  deletedCoords: string[]
}

export async function readCache(path: string): Promise<CacheState | undefined> {
  let text: string
  try {
    text = await Deno.readTextFile(path)
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return undefined
    throw err
  }
  const parsed = JSON.parse(text) as unknown
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as { lastKnownGoodCount?: unknown }).lastKnownGoodCount !== 'number' ||
    !Array.isArray((parsed as { deletedCoords?: unknown }).deletedCoords)
  ) {
    throw new Error('Cache-File hat unbekanntes Format — bitte loeschen und neu starten')
  }
  return parsed as CacheState
}

export async function writeCache(path: string, state: CacheState): Promise<void> {
  await Deno.writeTextFile(path, JSON.stringify(state, null, 2) + '\n')
}
