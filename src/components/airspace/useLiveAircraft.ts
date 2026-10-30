import { useCallback, useEffect, useState } from 'react'
import type {
  DetectionDatabaseStatus,
  LiveAircraft,
  LiveAircraftResponse,
} from './contracts'

export type LiveStatus = 'connecting' | 'live' | 'stale' | 'error' | 'disabled'
const POLL_INTERVAL_MS = 12_000

export function useLiveAircraft(enabled: boolean) {
  const [aircraft, setAircraft] = useState<LiveAircraft[]>([])
  const [database, setDatabase] = useState<DetectionDatabaseStatus | null>(null)
  const [status, setStatus] = useState<LiveStatus>(enabled ? 'connecting' : 'disabled')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const refresh = useCallback(() => setRefreshIndex((value) => value + 1), [])

  useEffect(() => {
    if (!enabled) {
      setAircraft([])
      setDatabase(null)
      setStatus('disabled')
      setLastUpdated(null)
      setError(null)
      return
    }
    let cancelled = false
    let activeController: AbortController | null = null

    const load = async () => {
      activeController?.abort()
      activeController = new AbortController()
      setStatus((current) => current === 'disabled' ? 'connecting' : current)
      try {
        const response = await fetch('/api/public/airspace-aircraft', {
          signal: activeController.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error(`Detection feed returned ${response.status}`)
        const data = await response.json() as LiveAircraftResponse
        if (cancelled) return
        setAircraft(data.aircraft)
        setDatabase(data.database ?? null)
        setLastUpdated(data.fetchedAt)
        setStatus(data.stale ? 'stale' : 'live')
        setError(data.message ?? null)
      } catch (caught) {
        if (cancelled || (caught instanceof DOMException && caught.name === 'AbortError')) return
        setStatus('error')
        setError(caught instanceof Error ? caught.message : 'Unable to reach the detection feed.')
      }
    }

    setStatus((current) => current === 'live' || current === 'stale' ? current : 'connecting')
    void load()
    const interval = window.setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      activeController?.abort()
    }
  }, [enabled, refreshIndex])

  return { aircraft, database, status, lastUpdated, error, refresh }
}
