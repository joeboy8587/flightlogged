import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  ChevronRight,
  Database,
  ExternalLink,
  Info,
  Layers3,
  LocateFixed,
  MapPin,
  Minus,
  Mountain,
  Navigation,
  Plane,
  Plus,
  Radar,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { AirspaceCanvas, type AirspaceCanvasHandle } from './AirspaceCanvas'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { AirspaceCategory, LayerVisibility, SceneData, ViewPreset } from './aviation'
import { useLiveAircraft } from './useLiveAircraft'
import './kern-airspace.css'

const DEFAULT_LAYERS: LayerVisibility = { classD: true, classE: false, restricted: true, moa: false }
const LAYER_META: { id: AirspaceCategory; name: string; detail: string }[] = [
  { id: 'classD', name: 'Class D', detail: 'Controlled tower areas' },
  { id: 'classE', name: 'Class E', detail: 'Transition & surface areas' },
  { id: 'restricted', name: 'Restricted', detail: 'Special-use airspace' },
  { id: 'moa', name: 'Military operating', detail: 'MOA sectors' },
]
const VIEW_META: { id: ViewPreset; label: string }[] = [
  { id: 'overview', label: 'County' },
  { id: 'valley', label: 'Valley' },
  { id: 'desert', label: 'Desert' },
  { id: 'top', label: 'Plan' },
  { id: 'traffic', label: 'Traffic' },
]

export function KernAirspaceApp() {
  const sceneRef = useRef<AirspaceCanvasHandle>(null)
  const [data, setData] = useState<SceneData | null>(null)
  const [layers, setLayers] = useState<LayerVisibility>(DEFAULT_LAYERS)
  const [maxAltitude, setMaxAltitude] = useState(6000)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAircraftHex, setSelectedAircraftHex] = useState<string | null>(null)
  const [aoiSelected, setAoiSelected] = useState(false)
  const [liveEnabled, setLiveEnabled] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewPreset>('overview')
  const [mobileTab, setMobileTab] = useState<'layers' | 'airports'>('layers')
  const { aircraft, database, status: liveStatus, lastUpdated, error: liveError, refresh } = useLiveAircraft(liveEnabled)

  const selectedAirport = data?.airports.find((airport) => airport.id === selectedId) ?? null
  const selectedAircraft = aircraft.find((item) => item.hex === selectedAircraftHex) ?? null
  useEffect(() => {
    if (selectedAircraftHex && !aircraft.some((item) => item.hex === selectedAircraftHex)) setSelectedAircraftHex(null)
  }, [aircraft, selectedAircraftHex])

  const filteredAirports = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!data) return []
    if (!query) return data.airports
    return data.airports.filter((airport) => [airport.id, airport.localId, airport.name, airport.city]
      .some((value) => value.toLowerCase().includes(query)))
  }, [data, search])

  const selectAirport = (id: string, focus = false) => {
    setSelectedAircraftHex(null)
    setAoiSelected(false)
    setSelectedId(id)
    if (focus) sceneRef.current?.focusAirport(id)
  }

  const selectAircraft = (hex: string, focus = false) => {
    setSelectedId(null)
    setAoiSelected(false)
    setSelectedAircraftHex(hex)
    if (focus) sceneRef.current?.focusAircraft(hex)
  }

  const selectAoi = (focus = false) => {
    setSelectedId(null)
    setSelectedAircraftHex(null)
    setAoiSelected(true)
    if (focus) sceneRef.current?.focusAoi()
  }

  const changeView = (nextView: ViewPreset) => {
    setView(nextView)
    sceneRef.current?.setView(nextView)
  }

  const stats = useMemo(() => ({
    airports: data?.airports.length ?? 0,
    controlled: data?.airspaces.filter((space) => space.category === 'classD').length ?? 0,
    restricted: data?.airspaces.filter((space) => space.category === 'restricted').length ?? 0,
    peak: data?.terrain.maxFt ?? 0,
  }), [data])
  const liveStatusLabel = {
    connecting: 'Connecting',
    live: 'Receiving',
    stale: 'Stale data',
    error: 'Feed issue',
    disabled: 'Paused',
  }[liveStatus]
  const lastUpdateLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Awaiting data'

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Radar size={22} strokeWidth={1.7} /></span>
          <div><strong>KERN<span>/</span>AIRSPACE</strong><small>Three-dimensional aviation atlas</small></div>
        </div>
        <div className="topbar-meta">
          <span className="cycle-status"><i /> FAA cycle · 29 OCT—24 DEC 2026</span>
          <Dialog>
            <DialogTrigger asChild>
              <button className="about-button" type="button"><Info size={16} /> <span>About this model</span></button>
            </DialogTrigger>
            <DialogContent className="source-dialog">
              <DialogHeader>
                <DialogTitle>About the airspace model</DialogTitle>
                <DialogDescription>Real geospatial geometry, prepared for interactive visual exploration.</DialogDescription>
              </DialogHeader>
              <div className="source-copy">
                <p>Airspace footprints, vertical limits, airport positions, and field elevations come from FAA Aeronautical Information Services. The FAA Class Airspace cycle used here is effective October 29 through December 24, 2026.</p>
                <p>County context uses a generalized U.S. Census county boundary. Elevation is sampled from Mapzen/Terrain Tiles and vertically exaggerated approximately 2.5× to make terrain and altitude layers legible.</p>
                <p>Live detections come from adsb.lol within 120 nautical miles of the county center, refreshed every 12 seconds through a cached server proxy. Coverage depends on community receivers and is not a complete traffic picture. adsb.lol data is available under ODbL.</p>
                <p>A server-only Neon PostgreSQL connection enriches positioned aircraft with public FAA master registry matches and stores fresh observations in the existing detections table. Registry and storage interruptions do not interrupt the live traffic feed.</p>
                <p>The Pilot Avenue area of interest comes from the shared Google Maps pin, with its address-level position matched through the U.S. Census Geocoder. Regional terrain covers the complete 120-NM detection footprint; offshore elevations are clamped to sea level.</p>
                <div className="source-links">
                  <a href="https://ais-faa.opendata.arcgis.com/datasets/faa::class-airspace/about" target="_blank" rel="noreferrer">FAA Class Airspace <ExternalLink size={13} /></a>
                  <a href="https://ais-faa.opendata.arcgis.com/datasets/faa::special-use-airspace/about" target="_blank" rel="noreferrer">FAA Special Use Airspace <ExternalLink size={13} /></a>
                  <a href="https://github.com/tilezen/joerd" target="_blank" rel="noreferrer">Terrain Tiles project <ExternalLink size={13} /></a>
                  <a href="https://api.adsb.lol/" target="_blank" rel="noreferrer">adsb.lol live API <ExternalLink size={13} /></a>
                </div>
                <div className="navigation-warning"><Navigation size={17} /><span><strong>Not for navigation.</strong> Geometry is simplified, unlimited ceilings are visually capped, and activation status is not live. Consult current FAA charts and NOTAMs for flight planning.</span></div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="workspace">
        <aside className="control-panel" aria-label="Airspace controls">
          <div className="mobile-tabs" role="tablist" aria-label="Control panel">
            <button type="button" role="tab" aria-selected={mobileTab === 'layers'} onClick={() => setMobileTab('layers')}><Layers3 size={15} /> Layers</button>
            <button type="button" role="tab" aria-selected={mobileTab === 'airports'} onClick={() => setMobileTab('airports')}><Plane size={15} /> Airports</button>
          </div>

          <section className={`panel-section layers-section ${mobileTab === 'layers' ? 'mobile-active' : ''}`}>
            <div className="section-heading"><span>Airspace layers</span><Layers3 size={15} /></div>
            <div className="layer-list">
              {LAYER_META.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  role="switch"
                  aria-checked={layers[layer.id]}
                  className={`layer-toggle layer-toggle--${layer.id} ${layers[layer.id] ? 'is-active' : ''}`}
                  onClick={() => setLayers((current) => ({ ...current, [layer.id]: !current[layer.id] }))}
                >
                  <span className="layer-swatch" />
                  <span className="layer-copy"><strong>{layer.name}</strong><small>{layer.detail}</small></span>
                  <span className="switch-track"><i /></span>
                </button>
              ))}
            </div>

            <div className={`live-feed live-feed--${liveStatus}`}>
              <div className="live-feed-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={liveEnabled}
                  className={`live-toggle ${liveEnabled ? 'is-active' : ''}`}
                  onClick={() => {
                    if (liveEnabled) setSelectedAircraftHex(null)
                    setLiveEnabled((enabled) => !enabled)
                  }}
                >
                  <span className="live-icon"><Radio size={15} /></span>
                  <span className="layer-copy"><strong>Live detections</strong><small>{liveStatusLabel} · adsb.lol</small></span>
                  <span className="switch-track"><i /></span>
                </button>
                <button
                  type="button"
                  className="refresh-feed"
                  aria-label="Refresh live aircraft detections"
                  title="Refresh detections"
                  disabled={!liveEnabled || liveStatus === 'connecting'}
                  onClick={refresh}
                ><RefreshCw size={14} className={liveStatus === 'connecting' ? 'spin' : ''} /></button>
              </div>
              {liveEnabled && (
                <div className="live-feed-meta">
                  <span><i /> {aircraft.length} aircraft · 120 NM</span>
                  <span>{lastUpdateLabel}</span>
                </div>
              )}
              {liveEnabled && database && (
                <div className={`database-feed database-feed--${database.status}`}>
                  <Database size={11} />
                  <span>{database.status === 'linked' ? 'Neon linked' : database.status === 'partial' ? 'Neon partial' : 'Neon unavailable'}</span>
                  <small>{database.registryMatches} FAA · {database.persistedDetections} saved</small>
                </div>
              )}
              {liveEnabled && liveError && <p className="feed-error">{liveError}</p>}
              {liveEnabled && liveStatus === 'live' && aircraft.length === 0 && <p className="feed-empty">No positioned aircraft in the current scan.</p>}
            </div>

            <div className="altitude-control">
              <div className="altitude-heading"><span>Altitude ceiling</span><strong>{maxAltitude.toLocaleString()} <small>FT MSL</small></strong></div>
              <input
                aria-label="Altitude ceiling in feet MSL"
                type="range"
                min="1000"
                max="18000"
                step="500"
                value={maxAltitude}
                onChange={(event) => setMaxAltitude(Number(event.target.value))}
                style={{ '--range-progress': `${((maxAltitude - 1000) / 17000) * 100}%` } as React.CSSProperties}
              />
              <div className="range-labels"><span>1,000</span><span>18,000 FT</span></div>
              <p>The dashed plane marks your selected altitude. Higher volumes are clipped above it.</p>
            </div>
          </section>

          <section className={`panel-section airports-section ${mobileTab === 'airports' ? 'mobile-active' : ''}`}>
            <div className="section-heading"><span>Airfields</span><b>{data?.airports.length ?? '—'}</b></div>
            {data?.aoi && (
              <button type="button" className={`airport-row aoi-row ${aoiSelected ? 'is-selected' : ''}`} onClick={() => selectAoi(true)}>
                <span className="airport-symbol aoi-symbol"><MapPin size={15} /></span>
                <span><strong>{data.aoi.name}</strong><small>120 W Pilot Ave · Bakersfield</small></span>
                <ChevronRight size={14} />
              </button>
            )}
            <label className="airport-search">
              <Search size={15} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, city, or identifier" />
              {search && <button type="button" aria-label="Clear airport search" onClick={() => setSearch('')}><X size={14} /></button>}
            </label>
            <div className="airport-list" role="list">
              {filteredAirports.map((airport) => (
                <button
                  type="button"
                  role="listitem"
                  key={airport.id}
                  className={`airport-row ${selectedId === airport.id ? 'is-selected' : ''}`}
                  onClick={() => selectAirport(airport.id, true)}
                >
                  <span className={`airport-symbol ${airport.military ? 'is-military' : ''}`}><Plane size={15} /></span>
                  <span><strong>{airport.name}</strong><small>{airport.id} · {airport.city}</small></span>
                  <ChevronRight size={14} />
                </button>
              ))}
              {data && filteredAirports.length === 0 && <div className="empty-search">No airfields match “{search}”.</div>}
            </div>
          </section>
          <div className="panel-footnote"><Database size={12} /> FAA geometry · adsb.lol live · 12 s polling</div>
        </aside>

        <section className="viewport" aria-label="3D airspace viewport">
          <AirspaceCanvas
            ref={sceneRef}
            layers={layers}
            maxAltitude={maxAltitude}
            selectedAirport={selectedId}
            aircraft={liveEnabled ? aircraft : []}
            selectedAircraft={selectedAircraftHex}
            selectedAoi={aoiSelected}
            onReady={setData}
            onAirportSelect={(id) => selectAirport(id)}
            onAircraftSelect={(hex) => selectAircraft(hex)}
            onAoiSelect={() => selectAoi()}
          />
          <div className="viewport-readout">
            <span><i /> GEOSPATIAL MODEL</span>
            <small>KERN COUNTY + 120 NM · CALIFORNIA</small>
            {liveEnabled && <span className={`viewport-live viewport-live--${liveStatus}`}><Radio size={10} /> {liveStatus === 'live' ? `${aircraft.length} LIVE` : liveStatusLabel.toUpperCase()}</span>}
          </div>
          <div className="north-arrow" aria-hidden="true"><Navigation size={17} fill="currentColor" /><b>N</b></div>
          <div className="viewport-tools">
            <div className="view-presets" aria-label="Camera views">
              {VIEW_META.map((item) => <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => changeView(item.id)}>{item.label}</button>)}
            </div>
            <div className="zoom-tools">
              <button type="button" aria-label="Zoom in" onClick={() => sceneRef.current?.zoom('in')}><Plus size={17} /></button>
              <button type="button" aria-label="Zoom out" onClick={() => sceneRef.current?.zoom('out')}><Minus size={17} /></button>
              <button type="button" aria-label="Reset camera view" onClick={() => changeView('overview')}><RotateCcw size={16} /></button>
            </div>
          </div>
          <div className="viewport-hint"><Box size={13} /> Drag to orbit · Scroll to zoom · Select an airfield</div>
          <div className="scale-note">VERTICAL SCALE 2.5×</div>
        </section>

        <aside className="detail-panel" aria-label="Selection details">
          {selectedAircraft ? (
            <div className="airport-detail aircraft-detail">
              <div className="detail-kicker"><Radio size={14} /> Live aircraft detection</div>
              <div className="airport-identifier aircraft-identifier">{selectedAircraft.callsign}</div>
              <h2>{selectedAircraft.registration || selectedAircraft.hex.toUpperCase()}</h2>
              <p className="airport-city">{selectedAircraft.aircraftType ? `Type ${selectedAircraft.aircraftType} · ` : ''}ICAO {selectedAircraft.hex.toUpperCase()}</p>
              <div className="detail-grid">
                <div><span>Barometric altitude</span><strong>{selectedAircraft.onGround ? 'GROUND' : selectedAircraft.altitudeFt !== null ? `${selectedAircraft.altitudeFt.toLocaleString()} FT` : 'N/A'}</strong></div>
                <div><span>Ground speed</span><strong>{selectedAircraft.groundSpeedKt !== null ? `${Math.round(selectedAircraft.groundSpeedKt)} KT` : 'N/A'}</strong></div>
                <div><span>Track</span><strong>{selectedAircraft.trackDeg !== null ? `${Math.round(selectedAircraft.trackDeg)}°` : 'N/A'}</strong></div>
                <div><span>Vertical rate</span><strong>{selectedAircraft.verticalRateFpm !== null ? `${selectedAircraft.verticalRateFpm > 0 ? '+' : ''}${Math.round(selectedAircraft.verticalRateFpm)} FPM` : 'N/A'}</strong></div>
                <div><span>Position age</span><strong>{selectedAircraft.seenPositionSec !== null ? `${selectedAircraft.seenPositionSec.toFixed(1)} S` : 'N/A'}</strong></div>
                <div><span>Position</span><strong>{selectedAircraft.lat.toFixed(3)}°, {selectedAircraft.lon.toFixed(3)}°</strong></div>
              </div>
              {selectedAircraft.registry && (
                <section className="registry-card" aria-label="FAA master registry match">
                  <div className="registry-heading">
                    <Database size={13} />
                    <span>FAA master registry</span>
                    {selectedAircraft.registry.statusCode && <b>Status {selectedAircraft.registry.statusCode}</b>}
                  </div>
                  <div className="registry-grid">
                    <div><span>Registration</span><strong>{selectedAircraft.registry.registration}</strong></div>
                    <div><span>Year manufactured</span><strong>{selectedAircraft.registry.yearMfr ?? 'N/A'}</strong></div>
                    <div className="registry-registrant"><span>Registrant</span><strong>{selectedAircraft.registry.registrant ?? 'N/A'}</strong></div>
                  </div>
                  <p>Public registry match · Snapshot {database?.faaVintage ?? 'current'}</p>
                </section>
              )}
              {!selectedAircraft.registry && database?.status === 'linked' && (
                <p className="registry-missing">No FAA master registry match for this ICAO address.</p>
              )}
              <div className="airport-tags">
                <span>{liveStatus === 'live' ? 'Live' : liveStatusLabel}</span>
                <span>{selectedAircraft.onGround ? 'On ground' : 'Airborne'}</span>
              </div>
              <button type="button" className="locate-button" onClick={() => sceneRef.current?.focusAircraft(selectedAircraft.hex)}><LocateFixed size={16} /> Track in 3D</button>
              <button type="button" className="clear-selection" onClick={() => setSelectedAircraftHex(null)}>Clear selection</button>
              <p className="detection-note">Community-fed ADS-B detection. Position updates every 12 seconds; recent trail points appear only after subsequent scans.</p>
            </div>
          ) : aoiSelected && data?.aoi ? (
            <div className="airport-detail aoi-detail">
              <div className="detail-kicker"><MapPin size={14} /> Area of interest</div>
              <div className="airport-identifier aoi-identifier">AOI</div>
              <h2>{data.aoi.name}</h2>
              <p className="airport-city">{data.aoi.address}</p>
              <div className="detail-grid">
                <div><span>Latitude</span><strong>{data.aoi.lat.toFixed(6)}°</strong></div>
                <div><span>Longitude</span><strong>{data.aoi.lon.toFixed(6)}°</strong></div>
                <div><span>Reference</span><strong>Shared map pin</strong></div>
                <div><span>Detection footprint</span><strong>Within 120 NM</strong></div>
              </div>
              <div className="airport-tags"><span>User supplied</span><span>Bakersfield</span></div>
              <button type="button" className="locate-button" onClick={() => sceneRef.current?.focusAoi()}><LocateFixed size={16} /> Focus AOI in 3D</button>
              <a className="aoi-map-link" href={data.aoi.mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps <ExternalLink size={14} /></a>
              <button type="button" className="clear-selection" onClick={() => setAoiSelected(false)}>Clear selection</button>
              <p className="detection-note">Address-level position matched from the shared pin. The amber marker is an area-of-interest reference, not an airport or navigational fix.</p>
            </div>
          ) : selectedAirport ? (
            <div className="airport-detail">
              <div className="detail-kicker"><MapPin size={14} /> Selected airfield</div>
              <div className="airport-identifier">{selectedAirport.id}</div>
              <h2>{selectedAirport.name}</h2>
              <p className="airport-city">{selectedAirport.city}, California</p>
              <div className="detail-grid">
                <div><span>Field elevation</span><strong>{selectedAirport.elevationFt.toLocaleString()} <small>FT</small></strong></div>
                <div><span>Local identifier</span><strong>{selectedAirport.localId}</strong></div>
                <div><span>Latitude</span><strong>{selectedAirport.lat.toFixed(4)}°</strong></div>
                <div><span>Longitude</span><strong>{selectedAirport.lon.toFixed(4)}°</strong></div>
              </div>
              <div className="airport-tags">
                <span>{selectedAirport.military ? 'Military' : 'Civil'}</span>
                <span>{selectedAirport.privateUse ? 'Private use' : 'Public use'}</span>
              </div>
              <button type="button" className="locate-button" onClick={() => sceneRef.current?.focusAirport(selectedAirport.id)}><LocateFixed size={16} /> Locate in 3D</button>
              <button type="button" className="clear-selection" onClick={() => setSelectedId(null)}>Clear selection</button>
            </div>
          ) : (
            <div className="regional-briefing">
              <div className="detail-kicker"><Mountain size={14} /> Regional overview</div>
              <h1>Where valley<br />meets high desert.</h1>
              <p>Explore Kern County’s airspace as a landscape. Orbit the terrain, isolate altitude layers, and select any airfield for its position and elevation.</p>
              <div className="stat-grid">
                <div><strong>{stats.airports || '—'}</strong><span>Operational airfields</span></div>
                <div><strong>{stats.controlled || '—'}</strong><span>Class D areas</span></div>
                <div><strong>{stats.restricted || '—'}</strong><span>Restricted areas</span></div>
                <div><strong>{stats.peak ? `${(stats.peak / 1000).toFixed(1)}k` : '—'}</strong><span>Peak terrain · FT</span></div>
              </div>
              <div className="briefing-note"><span className="note-line" /><p><strong>Start with Class D.</strong> Four controlled volumes are visible by default. Add Class E or military operating areas to build the fuller picture.</p></div>
            </div>
          )}
          <div className="safety-note"><Info size={14} /><span>Visual exploration only.<br />Not for flight planning or navigation.</span></div>
        </aside>
      </div>
    </main>
  )
}
