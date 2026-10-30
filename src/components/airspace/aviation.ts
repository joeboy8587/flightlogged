import type { Geometry } from 'geojson'

export interface Airport {
  id: string
  localId: string
  name: string
  city: string
  lon: number
  lat: number
  elevationFt: number
  military: boolean
  privateUse: boolean
}

export type AirspaceCategory = 'classD' | 'classE' | 'restricted' | 'moa'
export type LayerVisibility = Record<AirspaceCategory, boolean>

export interface Airspace {
  id: string
  name: string
  category: AirspaceCategory
  class: string
  lowerFt: number
  upperFt: number
  lowerLabel: string
  upperLabel: string
  times: string
  geometry: Geometry
}

export interface CountyData {
  geometry: Geometry
}

export interface TerrainData {
  width: number
  height: number
  bbox: [number, number, number, number]
  minFt: number
  maxFt: number
  heights: number[]
  inside: string
}

export interface AreaOfInterest {
  id: string
  name: string
  address: string
  lat: number
  lon: number
  mapsUrl: string
}

export interface SceneData {
  airports: Airport[]
  airspaces: Airspace[]
  county: CountyData
  terrain: TerrainData
  aoi: AreaOfInterest
}

export type ViewPreset = 'overview' | 'valley' | 'desert' | 'top' | 'traffic'

export interface SceneMetrics {
  drawCalls: number
  triangles: number
  fps: number
}
