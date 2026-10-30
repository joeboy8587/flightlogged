import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { KernAirspaceScene } from './KernAirspaceScene'
import type { LayerVisibility, SceneData, ViewPreset } from './aviation'
import type { LiveAircraft } from './contracts'

export interface AirspaceCanvasHandle {
  focusAirport: (id: string) => void
  focusAircraft: (hex: string) => void
  focusAoi: () => void
  setView: (view: ViewPreset) => void
  zoom: (direction: 'in' | 'out') => void
}

interface Props {
  layers: LayerVisibility
  maxAltitude: number
  selectedAirport: string | null
  aircraft: LiveAircraft[]
  selectedAircraft: string | null
  selectedAoi: boolean
  onReady: (data: SceneData) => void
  onAirportSelect: (id: string) => void
  onAircraftSelect: (hex: string) => void
  onAoiSelect: () => void
}

export const AirspaceCanvas = forwardRef<AirspaceCanvasHandle, Props>(function AirspaceCanvas(
  { layers, maxAltitude, selectedAirport, aircraft, selectedAircraft, selectedAoi, onReady, onAirportSelect, onAircraftSelect, onAoiSelect },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<KernAirspaceScene | null>(null)
  const callbacksRef = useRef({ onReady, onAirportSelect, onAircraftSelect, onAoiSelect })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  callbacksRef.current = { onReady, onAirportSelect, onAircraftSelect, onAoiSelect }

  useImperativeHandle(ref, () => ({
    focusAirport: (id) => sceneRef.current?.focusAirport(id),
    focusAircraft: (hex) => sceneRef.current?.focusAircraft(hex),
    focusAoi: () => sceneRef.current?.focusAoi(),
    setView: (view) => sceneRef.current?.setView(view),
    zoom: (direction) => sceneRef.current?.zoom(direction),
  }), [])

  useEffect(() => {
    if (!containerRef.current) return
    let scene: KernAirspaceScene
    try {
      scene = new KernAirspaceScene(containerRef.current, {
        onReady: (data) => {
          setStatus('ready')
          callbacksRef.current.onReady(data)
        },
        onError: (message) => {
          setError(message)
          setStatus('error')
        },
        onAirportSelect: (id) => callbacksRef.current.onAirportSelect(id),
        onAircraftSelect: (hex) => callbacksRef.current.onAircraftSelect(hex),
        onAoiSelect: () => callbacksRef.current.onAoiSelect(),
      })
      sceneRef.current = scene
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'WebGL is unavailable in this browser.')
      setStatus('error')
    }
    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => sceneRef.current?.setLayers(layers), [layers])
  useEffect(() => sceneRef.current?.setMaxAltitude(maxAltitude), [maxAltitude])
  useEffect(() => sceneRef.current?.selectAirport(selectedAirport), [selectedAirport])
  useEffect(() => sceneRef.current?.selectAoi(selectedAoi), [selectedAoi])
  useEffect(() => sceneRef.current?.setAircraft(aircraft), [aircraft])
  useEffect(() => sceneRef.current?.selectAircraft(selectedAircraft), [selectedAircraft])

  return (
    <div className="scene-shell">
      <div className="scene-poster" aria-hidden="true">
        <span className="poster-ring poster-ring--one" />
        <span className="poster-ring poster-ring--two" />
      </div>
      <div ref={containerRef} className="scene-canvas" />
      {status === 'loading' && (
        <div className="scene-status" role="status">
          <LoaderCircle className="spin" size={22} />
          <div><strong>Building the airspace model</strong><span>Loading FAA geometry and regional elevation terrain</span></div>
        </div>
      )}
      {status === 'error' && (
        <div className="scene-status scene-status--error" role="alert">
          <AlertTriangle size={24} />
          <div><strong>The 3D view could not start</strong><span>{error}</span></div>
        </div>
      )}
    </div>
  )
})
