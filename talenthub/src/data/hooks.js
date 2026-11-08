import { useEffect, useState, useSyncExternalStore } from 'react'
import { fetchCatalog, fetchRecommendations, getRevision, subscribe } from './store.js'

export function useStoreRevision() { return useSyncExternalStore(subscribe, getRevision, getRevision) }
function useQuery(key, load, setError) {
  const [result, setResult] = useState({ key: null, items: [] })
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    load(controller.signal).then(items => {
      if (active) setResult({ key, items })
    }).catch(error => { if (active && !controller.signal.aborted) { setResult({ key, items: [] }); setError?.(error.message) } })
    return () => { active = false; controller.abort() }
    // key contains every input to the request and the shared cache revision.
  }, [key])
  return result.key === key ? result.items : []
}
export function useCatalog(filters, setError) {
  const revision = useStoreRevision()
  return useQuery(JSON.stringify(['catalog', revision, filters]), signal => fetchCatalog(filters, signal), setError)
}
export function useRecommendations(directions, childId, setError) {
  const revision = useStoreRevision()
  return useQuery(JSON.stringify(['recommendations', revision, directions, childId]), signal => fetchRecommendations(directions, childId, signal), setError)
}
