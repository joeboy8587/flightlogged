export interface FaaRegistryMatch {
  registration: string
  yearMfr: number | null
  registrant: string | null
  statusCode: string | null
}

export interface DetectionDatabaseStatus {
  status: 'linked' | 'partial' | 'offline'
  registryMatches: number
  persistedDetections: number
  faaVintage: string | null
}

export interface LiveAircraft {
  hex: string
  callsign: string
  registration: string | null
  aircraftType: string | null
  lat: number
  lon: number
  altitudeFt: number | null
  onGround: boolean
  groundSpeedKt: number | null
  trackDeg: number | null
  verticalRateFpm: number | null
  seenPositionSec: number | null
  category: string | null
  registry: FaaRegistryMatch | null
}

export interface LiveAircraftResponse {
  source: 'adsb.lol'
  radiusNm: number
  fetchedAt: string
  cached: boolean
  stale: boolean
  aircraft: LiveAircraft[]
  database: DetectionDatabaseStatus
  message?: string
}
