import * as THREE from 'three'
import type { Geometry, Position } from 'geojson'
import type { LiveAircraft } from './contracts'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type {
  Airport,
  AreaOfInterest,
  Airspace,
  AirspaceCategory,
  LayerVisibility,
  SceneData,
  SceneMetrics,
  TerrainData,
  ViewPreset,
} from './aviation'

const CENTER_LON = -118.90517
const CENTER_LAT = 35.29394
const WORLD_PER_KM = 0.65
const ALTITUDE_SCALE = 0.00165
const KEY_AIRPORTS = new Set(['KBFL', 'KMHV', 'KEDW', 'KNID', 'KIYK', 'KTSP', 'L05', 'KMIT', 'KDLO', 'L71', 'L00'])
const COLORS: Record<AirspaceCategory, string> = {
  classD: '#53d5df',
  classE: '#a9b7ff',
  restricted: '#ff776d',
  moa: '#e8b55e',
}

interface SceneCallbacks {
  onReady: (data: SceneData) => void
  onError: (message: string) => void
  onAirportSelect: (id: string) => void
  onAircraftSelect: (hex: string) => void
  onAoiSelect: () => void
  onMetrics?: (metrics: SceneMetrics) => void
}

interface CameraTween {
  startedAt: number
  fromPosition: THREE.Vector3
  toPosition: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
}

interface AircraftVisual {
  group: THREE.Group
  label: HTMLElement
  trail: THREE.Line
  groundRing: THREE.Mesh
  stem: THREE.Line
  targetPosition: THREE.Vector3
  targetHeading: number
  groundY: number
  materials: THREE.Material[]
}

declare global {
  interface Window {
    __SCENE_READY__?: boolean
    __seek?: (time: number) => void
  }
}

export class KernAirspaceScene {
  private container: HTMLElement
  private callbacks: SceneCallbacks
  private renderer: THREE.WebGLRenderer
  private labelRenderer: CSS2DRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private resizeObserver: ResizeObserver
  private frameId = 0
  private data: SceneData | null = null
  private airportGroups = new Map<string, THREE.Group>()
  private airportLabels = new Map<string, HTMLElement>()
  private aoiGroup: THREE.Group | null = null
  private aoiLabel: HTMLElement | null = null
  private aircraftVisuals = new Map<string, AircraftVisual>()
  private aircraftTrails = new Map<string, THREE.Vector3[]>()
  private liveAircraft: LiveAircraft[] = []
  private selectedAircraftHex: string | null = null
  private airspaceGroups: { group: THREE.Group; airspace: Airspace }[] = []
  private airspaceMaterials = new Set<THREE.Material>()
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private pointerDown = new THREE.Vector2()
  private selectedRing: THREE.Mesh | null = null
  private sliceLine: THREE.LineLoop | null = null
  private sliceLabel: CSS2DObject | null = null
  private layers: LayerVisibility = { classD: true, classE: false, restricted: true, moa: false }
  private maxAltitude = 6000
  private tween: CameraTween | null = null
  private lastMetricsAt = 0
  private framesSinceMetrics = 0
  private disposed = false

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container
    this.callbacks = callbacks
    this.scene.background = new THREE.Color('#071216')
    this.scene.fog = new THREE.Fog('#071216', 320, 780)
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1600)
    this.camera.position.set(85, 100, 185)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.localClippingEnabled = true
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D map of Kern County airspace')
    this.renderer.domElement.setAttribute('role', 'img')
    this.container.appendChild(this.renderer.domElement)

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.domElement.className = 'scene-labels'
    this.container.appendChild(this.labelRenderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 1, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.075
    this.controls.minDistance = 24
    this.controls.maxDistance = 620
    this.controls.maxPolarAngle = Math.PI / 2.06
    this.controls.screenSpacePanning = false

    this.addLightingAndGround()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)
    this.resize()
    this.bindPointerEvents()
    this.animate()
    void this.loadData()
  }

  private async loadData() {
    try {
      const [airports, airspaces, county, terrain, aoi] = await Promise.all([
        fetch('/airspace-data/airports.json').then((r) => this.checkedJson<Airport[]>(r)),
        fetch('/airspace-data/airspace.json').then((r) => this.checkedJson<Airspace[]>(r)),
        fetch('/airspace-data/county.json').then((r) => this.checkedJson<SceneData['county']>(r)),
        fetch('/airspace-data/terrain.json').then((r) => this.checkedJson<TerrainData>(r)),
        fetch('/airspace-data/aoi.json').then((r) => this.checkedJson<AreaOfInterest>(r)),
      ])
      if (this.disposed) return
      this.data = { airports, airspaces, county, terrain, aoi }
      this.buildTerrain(terrain)
      this.buildCounty()
      this.buildCoverageFootprint()
      this.buildAirspaces(airspaces)
      this.buildAirports(airports)
      this.buildAoi(aoi)
      this.buildAltitudeSlice()
      this.syncAircraft()
      this.setLayers(this.layers)
      this.setMaxAltitude(this.maxAltitude)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.labelRenderer.render(this.scene, this.camera)
      window.__SCENE_READY__ = true
      window.__seek = () => {
        this.renderer.render(this.scene, this.camera)
        this.labelRenderer.render(this.scene, this.camera)
      }
      this.callbacks.onReady(this.data)
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : 'Unable to load the scene data.')
    }
  }

  private async checkedJson<T>(response: Response): Promise<T> {
    if (!response.ok) throw new Error(`Scene data request failed (${response.status}).`)
    return response.json() as Promise<T>
  }

  private addLightingAndGround() {
    const hemisphere = new THREE.HemisphereLight('#a7d9df', '#071012', 1.75)
    this.scene.add(hemisphere)
    const key = new THREE.DirectionalLight('#ffe0ac', 2.25)
    key.position.set(-90, 150, 75)
    this.scene.add(key)
    const fill = new THREE.DirectionalLight('#4c9fb2', 0.7)
    fill.position.set(110, 55, -90)
    this.scene.add(fill)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1800, 1800),
      new THREE.MeshStandardMaterial({ color: '#071216', roughness: 1, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2.4
    this.scene.add(ground)
    const grid = new THREE.GridHelper(800, 80, '#18343a', '#10262b')
    grid.position.y = -2.25
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    gridMaterials.forEach((material) => {
      material.transparent = true
      material.opacity = 0.25
    })
    this.scene.add(grid)
  }

  private project(lon: number, lat: number) {
    const x = (lon - CENTER_LON) * 111.32 * Math.cos(THREE.MathUtils.degToRad(CENTER_LAT)) * WORLD_PER_KM
    const z = -(lat - CENTER_LAT) * 111.32 * WORLD_PER_KM
    return { x, z }
  }

  private geometryPolygons(geometry: Geometry): Position[][][] {
    if (geometry.type === 'Polygon') return [geometry.coordinates]
    if (geometry.type === 'MultiPolygon') return geometry.coordinates
    return []
  }

  private sampleElevation(lon: number, lat: number) {
    if (!this.data) return 0
    const terrain = this.data.terrain
    const [minLon, minLat, maxLon, maxLat] = terrain.bbox
    const px = THREE.MathUtils.clamp((lon - minLon) / (maxLon - minLon), 0, 1) * (terrain.width - 1)
    const py = THREE.MathUtils.clamp((maxLat - lat) / (maxLat - minLat), 0, 1) * (terrain.height - 1)
    const x0 = Math.floor(px)
    const y0 = Math.floor(py)
    const x1 = Math.min(x0 + 1, terrain.width - 1)
    const y1 = Math.min(y0 + 1, terrain.height - 1)
    const fx = px - x0
    const fy = py - y0
    const sample = (x: number, y: number) => terrain.heights[y * terrain.width + x] * 3.28084
    const top = THREE.MathUtils.lerp(sample(x0, y0), sample(x1, y0), fx)
    const bottom = THREE.MathUtils.lerp(sample(x0, y1), sample(x1, y1), fx)
    return THREE.MathUtils.lerp(top, bottom, fy) * ALTITUDE_SCALE
  }

  private buildTerrain(terrain: TerrainData) {
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const [minLon, minLat, maxLon, maxLat] = terrain.bbox
    const low = new THREE.Color('#29423e')
    const middle = new THREE.Color('#607063')
    const high = new THREE.Color('#b0a58a')
    const outsideTint = new THREE.Color('#101f23')

    for (let row = 0; row < terrain.height; row += 1) {
      const lat = maxLat - (row / (terrain.height - 1)) * (maxLat - minLat)
      for (let col = 0; col < terrain.width; col += 1) {
        const lon = minLon + (col / (terrain.width - 1)) * (maxLon - minLon)
        const point = this.project(lon, lat)
        const elevationFt = terrain.heights[row * terrain.width + col] * 3.28084
        positions.push(point.x, elevationFt * ALTITUDE_SCALE, point.z)
        const normalized = THREE.MathUtils.clamp(elevationFt / 9000, 0, 1)
        const color = normalized < 0.5
          ? low.clone().lerp(middle, normalized * 2)
          : middle.clone().lerp(high, (normalized - 0.5) * 2)
        if (terrain.inside[row * terrain.width + col] === '0') color.lerp(outsideTint, 0.68)
        colors.push(color.r, color.g, color.b)
      }
    }
    for (let row = 0; row < terrain.height - 1; row += 1) {
      for (let col = 0; col < terrain.width - 1; col += 1) {
        const a = row * terrain.width + col
        const b = a + 1
        const d = a + terrain.width
        const c = d + 1
        indices.push(a, d, b, b, d, c)
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
    }))
    mesh.name = 'Regional elevation terrain · 120 NM detection footprint'
    this.scene.add(mesh)

    const northwest = this.project(minLon, maxLat)
    const southeast = this.project(maxLon, minLat)
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(southeast.x - northwest.x, 2.2, southeast.z - northwest.z),
      new THREE.MeshStandardMaterial({ color: '#0d2024', roughness: 0.95 }),
    )
    base.position.set((northwest.x + southeast.x) / 2, -1.25, (northwest.z + southeast.z) / 2)
    this.scene.add(base)
  }

  private buildCounty() {
    if (!this.data) return
    const material = new THREE.LineBasicMaterial({ color: '#e5d39a', transparent: true, opacity: 0.82 })
    this.geometryPolygons(this.data.county.geometry).forEach((polygon) => {
      const ring = polygon[0]
      const points = ring.map(([lon, lat]) => {
        const p = this.project(lon, lat)
        return new THREE.Vector3(p.x, this.sampleElevation(lon, lat) + 0.34, p.z)
      })
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material))
    })
  }

  private buildCoverageFootprint() {
    const radiusKm = 120 * 1.852
    const points: THREE.Vector3[] = []
    for (let index = 0; index <= 180; index += 1) {
      const angle = index / 180 * Math.PI * 2
      const lat = CENTER_LAT + Math.sin(angle) * radiusKm / 111.32
      const lon = CENTER_LON + Math.cos(angle) * radiusKm / (111.32 * Math.cos(THREE.MathUtils.degToRad(CENTER_LAT)))
      const point = this.project(lon, lat)
      points.push(new THREE.Vector3(point.x, this.sampleElevation(lon, lat) + 0.24, point.z))
    }
    const coverage = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineDashedMaterial({ color: '#79cdd1', transparent: true, opacity: 0.28, dashSize: 2.4, gapSize: 1.8 }),
    )
    coverage.computeLineDistances()
    this.scene.add(coverage)
    const labelElement = document.createElement('div')
    labelElement.className = 'coverage-label'
    labelElement.textContent = '120 NM · LIVE COVERAGE'
    const label = new CSS2DObject(labelElement)
    const east = points[0]
    label.position.set(east.x, east.y + 2.4, east.z)
    this.scene.add(label)
  }

  private buildAirspaces(airspaces: Airspace[]) {
    airspaces.forEach((airspace) => {
      const group = new THREE.Group()
      group.name = airspace.name
      const color = new THREE.Color(COLORS[airspace.category])
      const capMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: airspace.category === 'classE' ? 0.055 : 0.095,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const wallMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: airspace.category === 'restricted' ? 0.13 : 0.085,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
      const lineMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.78 })
      ;[capMaterial, wallMaterial, lineMaterial].forEach((material) => this.airspaceMaterials.add(material))
      const bottom = Math.max(0.4, airspace.lowerFt * ALTITUDE_SCALE)
      const top = Math.min(60000 * ALTITUDE_SCALE, airspace.upperFt * ALTITUDE_SCALE)
      const labelPoints: THREE.Vector3[] = []

      this.geometryPolygons(airspace.geometry).forEach((polygon) => {
        polygon.forEach((ring) => {
          const bottomPoints: THREE.Vector3[] = []
          const topPoints: THREE.Vector3[] = []
          const wallPositions: number[] = []
          const wallIndices: number[] = []
          ring.forEach(([lon, lat], index) => {
            const p = this.project(lon, lat)
            const bottomPoint = new THREE.Vector3(p.x, bottom, p.z)
            const topPoint = new THREE.Vector3(p.x, top, p.z)
            bottomPoints.push(bottomPoint)
            topPoints.push(topPoint)
            labelPoints.push(topPoint)
            wallPositions.push(p.x, bottom, p.z, p.x, top, p.z)
            if (index < ring.length - 1) {
              const a = index * 2
              wallIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
            }
          })
          const wallGeometry = new THREE.BufferGeometry()
          wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wallPositions, 3))
          wallGeometry.setIndex(wallIndices)
          group.add(new THREE.Mesh(wallGeometry, wallMaterial))
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(topPoints), lineMaterial))
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bottomPoints), lineMaterial))
        })

        const contour = polygon[0].map(([lon, lat]) => {
          const p = this.project(lon, lat)
          return new THREE.Vector2(p.x, p.z)
        })
        const holes = polygon.slice(1).map((ring) => ring.map(([lon, lat]) => {
          const p = this.project(lon, lat)
          return new THREE.Vector2(p.x, p.z)
        }))
        const triangles = THREE.ShapeUtils.triangulateShape(contour, holes)
        const allPoints = [contour, ...holes].flat()
        const capPositions = allPoints.flatMap((p) => [p.x, top, p.y])
        const capGeometry = new THREE.BufferGeometry()
        capGeometry.setAttribute('position', new THREE.Float32BufferAttribute(capPositions, 3))
        capGeometry.setIndex(triangles.flat())
        group.add(new THREE.Mesh(capGeometry, capMaterial))
      })

      if (labelPoints.length) {
        const center = labelPoints.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(labelPoints.length)
        const element = document.createElement('div')
        element.className = `airspace-label airspace-label--${airspace.category}`
        element.innerHTML = `<span>${airspace.name.replace(/ Class [DE]\d?/, '')}</span><b>${airspace.upperLabel}</b>`
        const label = new CSS2DObject(element)
        label.position.copy(center)
        group.add(label)
      }
      this.airspaceGroups.push({ group, airspace })
      this.scene.add(group)
    })
  }

  private buildAirports(airports: Airport[]) {
    airports.forEach((airport) => {
      const group = new THREE.Group()
      const point = this.project(airport.lon, airport.lat)
      const groundY = this.sampleElevation(airport.lon, airport.lat)
      group.position.set(point.x, groundY, point.z)
      group.userData.airportId = airport.id
      const color = airport.military ? '#f0be6a' : '#d5f3ee'
      const stemGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.2, 0),
        new THREE.Vector3(0, 3.2, 0),
      ])
      group.add(new THREE.Line(stemGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.72 })))
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.86, 0),
        new THREE.MeshBasicMaterial({ color }),
      )
      marker.position.y = 3.35
      marker.userData.airportId = airport.id
      group.add(marker)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.15, 1.38, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.22
      ring.userData.airportId = airport.id
      group.add(ring)
      const hitTarget = new THREE.Mesh(
        new THREE.SphereGeometry(2.1, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false }),
      )
      hitTarget.position.y = 2.8
      hitTarget.userData.airportId = airport.id
      group.add(hitTarget)

      const labelElement = document.createElement('div')
      labelElement.className = `airport-label${KEY_AIRPORTS.has(airport.id) ? ' airport-label--key' : ''}`
      labelElement.innerHTML = `<b>${airport.id}</b><span>${airport.elevationFt.toLocaleString()} FT</span>`
      const label = new CSS2DObject(labelElement)
      label.position.set(0, 5.2, 0)
      group.add(label)
      this.airportGroups.set(airport.id, group)
      this.airportLabels.set(airport.id, labelElement)
      this.scene.add(group)
    })
    this.selectedRing = new THREE.Mesh(
      new THREE.RingGeometry(2.25, 2.55, 48),
      new THREE.MeshBasicMaterial({ color: '#ffcf74', transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
    )
    this.selectedRing.rotation.x = -Math.PI / 2
    this.selectedRing.visible = false
    this.scene.add(this.selectedRing)
  }

  private buildAoi(aoi: AreaOfInterest) {
    const group = new THREE.Group()
    const point = this.project(aoi.lon, aoi.lat)
    group.position.set(point.x, this.sampleElevation(aoi.lon, aoi.lat), point.z)
    group.userData.aoiId = aoi.id
    const color = '#ffcf74'
    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 4.2, 0)]),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    )
    group.add(stem)
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.88, 16, 12),
      new THREE.MeshBasicMaterial({ color }),
    )
    pin.position.y = 4.85
    pin.userData.aoiId = aoi.id
    group.add(pin)
    const pointMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.56, 1.65, 16),
      new THREE.MeshBasicMaterial({ color }),
    )
    pointMesh.rotation.z = Math.PI
    pointMesh.position.y = 3.95
    pointMesh.userData.aoiId = aoi.id
    group.add(pointMesh)
    ;[2.05, 2.8].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.12, radius, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: index ? 0.32 : 0.82, side: THREE.DoubleSide }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.2
      ring.userData.aoiId = aoi.id
      group.add(ring)
    })
    const hitTarget = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 10, 10),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    hitTarget.position.y = 4.2
    hitTarget.userData.aoiId = aoi.id
    group.add(hitTarget)
    const labelElement = document.createElement('div')
    labelElement.className = 'airport-label airport-label--key aoi-label'
    const title = document.createElement('b')
    title.textContent = 'PILOT AVE AOI'
    const subtitle = document.createElement('span')
    subtitle.textContent = 'BAKERSFIELD'
    labelElement.append(title, subtitle)
    const label = new CSS2DObject(labelElement)
    label.position.set(0, 7, 0)
    group.add(label)
    this.aoiGroup = group
    this.aoiLabel = labelElement
    this.scene.add(group)
  }

  private aircraftPosition(aircraft: LiveAircraft) {
    const point = this.project(aircraft.lon, aircraft.lat)
    const groundY = this.sampleElevation(aircraft.lon, aircraft.lat)
    const y = aircraft.onGround
      ? groundY + 0.65
      : aircraft.altitudeFt !== null
        ? Math.max(groundY + 0.65, aircraft.altitudeFt * ALTITUDE_SCALE)
        : groundY + 3
    return { position: new THREE.Vector3(point.x, y, point.z), groundY }
  }

  private createAircraftVisual(aircraft: LiveAircraft): AircraftVisual {
    const { position, groundY } = this.aircraftPosition(aircraft)
    const group = new THREE.Group()
    group.position.copy(position)
    group.userData.aircraftHex = aircraft.hex
    const materials: THREE.Material[] = []
    const makeMaterial = () => {
      const material = new THREE.MeshBasicMaterial({ color: '#c3f47a' })
      materials.push(material)
      return material
    }
    const addPart = (geometry: THREE.BufferGeometry, z: number, rotate = false) => {
      const mesh = new THREE.Mesh(geometry, makeMaterial())
      if (rotate) mesh.rotation.x = -Math.PI / 2
      mesh.position.z = z
      mesh.userData.aircraftHex = aircraft.hex
      group.add(mesh)
    }
    addPart(new THREE.CylinderGeometry(0.23, 0.34, 2.2, 8), 0, true)
    addPart(new THREE.ConeGeometry(0.34, 1.05, 8), -1.55, true)
    addPart(new THREE.BoxGeometry(3.1, 0.13, 0.54), -0.05)
    addPart(new THREE.BoxGeometry(1.3, 0.12, 0.36), 0.92)
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.68, 0.45), makeMaterial())
    tail.position.set(0, 0.32, 0.82)
    tail.userData.aircraftHex = aircraft.hex
    group.add(tail)
    const hitTarget = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 8), new THREE.MeshBasicMaterial({ visible: false }))
    hitTarget.userData.aircraftHex = aircraft.hex
    group.add(hitTarget)

    const stem = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, groundY - position.y, 0)]),
      new THREE.LineDashedMaterial({ color: '#c3f47a', transparent: true, opacity: 0.34, dashSize: 0.8, gapSize: 0.6 }),
    )
    stem.computeLineDistances()
    group.add(stem)
    const groundRing = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 1.45, 28),
      new THREE.MeshBasicMaterial({ color: '#c3f47a', transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
    )
    groundRing.rotation.x = -Math.PI / 2
    groundRing.position.y = groundY - position.y + 0.16
    group.add(groundRing)

    const label = document.createElement('div')
    label.className = 'aircraft-label'
    const callsign = document.createElement('b')
    const altitude = document.createElement('span')
    label.append(callsign, altitude)
    const labelObject = new CSS2DObject(label)
    labelObject.position.set(0, 2.4, 0)
    group.add(labelObject)
    const trailGeometry = new THREE.BufferGeometry()
    const trailPositions = new THREE.Float32BufferAttribute(new Float32Array(6 * 3), 3)
    trailPositions.setXYZ(0, position.x, position.y, position.z)
    trailGeometry.setAttribute('position', trailPositions)
    trailGeometry.setDrawRange(0, 1)
    const trail = new THREE.Line(
      trailGeometry,
      new THREE.LineBasicMaterial({ color: '#c3f47a', transparent: true, opacity: 0.34 }),
    )
    this.scene.add(trail)
    this.scene.add(group)
    return {
      group,
      label,
      trail,
      groundRing,
      stem,
      targetPosition: position.clone(),
      targetHeading: 0,
      groundY,
      materials,
    }
  }

  private updateAircraftVisual(visual: AircraftVisual, aircraft: LiveAircraft) {
    const { position, groundY } = this.aircraftPosition(aircraft)
    visual.targetPosition.copy(position)
    visual.targetHeading = -THREE.MathUtils.degToRad(aircraft.trackDeg ?? 0)
    visual.groundY = groundY
    visual.group.userData.aircraftHex = aircraft.hex
    visual.groundRing.position.y = groundY - visual.group.position.y + 0.16
    visual.stem.geometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, groundY - visual.group.position.y, 0)])
    visual.stem.computeLineDistances()
    const stale = (aircraft.seenPositionSec ?? 0) > 30
    visual.materials.forEach((material) => {
      if (material instanceof THREE.MeshBasicMaterial) material.color.set(stale ? '#a7b6a9' : '#c3f47a')
    })
    visual.label.classList.toggle('aircraft-label--stale', stale)
    visual.label.classList.toggle('aircraft-label--selected', this.selectedAircraftHex === aircraft.hex)
    const callsign = visual.label.querySelector('b')
    const altitude = visual.label.querySelector('span')
    if (callsign) callsign.textContent = aircraft.callsign
    if (altitude) altitude.textContent = aircraft.onGround ? 'GND' : aircraft.altitudeFt !== null ? `${(Math.round(aircraft.altitudeFt / 100) * 100).toLocaleString()} FT` : 'ALT N/A'

    const history = this.aircraftTrails.get(aircraft.hex) ?? []
    if (!history.length || history[history.length - 1].distanceTo(position) > 0.08) history.push(position.clone())
    const trailPoints = history.slice(-6)
    this.aircraftTrails.set(aircraft.hex, trailPoints)
    const trailPositions = visual.trail.geometry.getAttribute('position') as THREE.BufferAttribute
    trailPoints.forEach((point, index) => trailPositions.setXYZ(index, point.x, point.y, point.z))
    trailPositions.needsUpdate = true
    visual.trail.geometry.setDrawRange(0, trailPoints.length)
    visual.trail.geometry.computeBoundingSphere()
  }

  private removeAircraftVisual(hex: string) {
    const visual = this.aircraftVisuals.get(hex)
    if (!visual) return
    this.scene.remove(visual.group)
    this.scene.remove(visual.trail)
    visual.label.remove()
    visual.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material.dispose())
      }
    })
    visual.trail.geometry.dispose()
    ;(visual.trail.material as THREE.Material).dispose()
    this.aircraftVisuals.delete(hex)
    this.aircraftTrails.delete(hex)
  }

  private syncAircraft() {
    if (!this.data) return
    const active = new Set(this.liveAircraft.map((aircraft) => aircraft.hex))
    this.aircraftVisuals.forEach((_, hex) => {
      if (!active.has(hex)) this.removeAircraftVisual(hex)
    })
    this.liveAircraft.forEach((aircraft) => {
      const visual = this.aircraftVisuals.get(aircraft.hex) ?? this.createAircraftVisual(aircraft)
      this.aircraftVisuals.set(aircraft.hex, visual)
      this.updateAircraftVisual(visual, aircraft)
    })
  }

  private buildAltitudeSlice() {
    if (!this.data) return
    const [minLon, minLat, maxLon, maxLat] = this.data.terrain.bbox
    const nw = this.project(minLon, maxLat)
    const se = this.project(maxLon, minLat)
    const points = [
      new THREE.Vector3(nw.x, 0, nw.z),
      new THREE.Vector3(se.x, 0, nw.z),
      new THREE.Vector3(se.x, 0, se.z),
      new THREE.Vector3(nw.x, 0, se.z),
    ]
    this.sliceLine = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineDashedMaterial({ color: '#f3ca78', transparent: true, opacity: 0.36, dashSize: 2, gapSize: 1.5 }),
    )
    this.sliceLine.computeLineDistances()
    this.scene.add(this.sliceLine)
    const element = document.createElement('div')
    element.className = 'altitude-label'
    this.sliceLabel = new CSS2DObject(element)
    this.sliceLabel.position.set(se.x, 0, se.z)
    this.scene.add(this.sliceLabel)
  }

  private bindPointerEvents() {
    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      this.pointerDown.set(event.clientX, event.clientY)
    })
    this.renderer.domElement.addEventListener('pointerup', (event) => {
      if (!this.data || this.pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) return
      const aircraftHex = this.pickAircraft(event)
      if (aircraftHex) {
        this.callbacks.onAircraftSelect(aircraftHex)
        return
      }
      if (this.pickAoi(event)) {
        this.callbacks.onAoiSelect()
        return
      }
      const id = this.pickAirport(event)
      if (id) this.callbacks.onAirportSelect(id)
    })
    this.renderer.domElement.addEventListener('pointermove', (event) => {
      if (event.buttons || !this.data) return
      this.renderer.domElement.style.cursor = this.pickAircraft(event) || this.pickAoi(event) || this.pickAirport(event) ? 'pointer' : 'grab'
    })
  }

  private pickAirport(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects([...this.airportGroups.values()], true)
    return hits.find((hit) => hit.object.userData.airportId)?.object.userData.airportId as string | undefined
  }

  private pickAoi(event: PointerEvent) {
    if (!this.aoiGroup) return false
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    return this.raycaster.intersectObject(this.aoiGroup, true)
      .some((hit) => Boolean(hit.object.userData.aoiId))
  }

  private pickAircraft(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects([...this.aircraftVisuals.values()].map((visual) => visual.group), true)
    return hits.find((hit) => hit.object.userData.aircraftHex)?.object.userData.aircraftHex as string | undefined
  }

  private resize() {
    const width = Math.max(1, this.container.clientWidth)
    const height = Math.max(1, this.container.clientHeight)
    this.camera.aspect = width / height
    const baseVerticalFov = THREE.MathUtils.degToRad(45)
    this.camera.fov = this.camera.aspect < 1.05
      ? Math.min(72, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(baseVerticalFov / 2) * (1.05 / this.camera.aspect))))
      : 45
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
    this.labelRenderer.setSize(width, height)
  }

  private animate() {
    if (this.disposed) return
    this.frameId = requestAnimationFrame(() => this.animate())
    const now = performance.now()
    if (this.tween) {
      const progress = THREE.MathUtils.clamp((now - this.tween.startedAt) / 720, 0, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      this.camera.position.lerpVectors(this.tween.fromPosition, this.tween.toPosition, eased)
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, eased)
      if (progress === 1) this.tween = null
    }
    this.aircraftVisuals.forEach((visual) => {
      visual.group.position.lerp(visual.targetPosition, 0.045)
      const headingDelta = THREE.MathUtils.euclideanModulo(visual.targetHeading - visual.group.rotation.y + Math.PI, Math.PI * 2) - Math.PI
      visual.group.rotation.y += headingDelta * 0.065
      visual.groundRing.position.y = visual.groundY - visual.group.position.y + 0.16
      visual.stem.geometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, visual.groundY - visual.group.position.y, 0)])
      visual.stem.computeLineDistances()
    })
    if (this.selectedAircraftHex && this.selectedRing) {
      const selected = this.aircraftVisuals.get(this.selectedAircraftHex)
      if (selected) {
        this.selectedRing.position.set(selected.group.position.x, selected.groundY + 0.3, selected.group.position.z)
        this.selectedRing.visible = true
      }
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.labelRenderer.render(this.scene, this.camera)
    this.framesSinceMetrics += 1
    if (now - this.lastMetricsAt > 1200) {
      const elapsed = now - this.lastMetricsAt
      const metrics = {
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        fps: this.lastMetricsAt ? Math.round((this.framesSinceMetrics * 1000) / elapsed) : 0,
      }
      this.renderer.domElement.dataset.drawCalls = String(metrics.drawCalls)
      this.renderer.domElement.dataset.triangles = String(metrics.triangles)
      this.callbacks.onMetrics?.(metrics)
      this.lastMetricsAt = now
      this.framesSinceMetrics = 0
    }
  }

  private moveCamera(position: THREE.Vector3, target: THREE.Vector3) {
    this.tween = {
      startedAt: performance.now(),
      fromPosition: this.camera.position.clone(),
      toPosition: position,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
    }
  }

  setAircraft(aircraft: LiveAircraft[]) {
    this.liveAircraft = aircraft
    this.syncAircraft()
  }

  setLayers(layers: LayerVisibility) {
    this.layers = layers
    this.airspaceGroups.forEach(({ group, airspace }) => {
      group.visible = layers[airspace.category] && airspace.lowerFt <= this.maxAltitude
    })
  }

  setMaxAltitude(value: number) {
    this.maxAltitude = value
    const clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), value * ALTITUDE_SCALE)
    this.airspaceMaterials.forEach((material) => {
      material.clippingPlanes = [clippingPlane]
      material.needsUpdate = true
    })
    this.airspaceGroups.forEach(({ group, airspace }) => {
      group.visible = this.layers[airspace.category] && airspace.lowerFt <= value
    })
    if (this.sliceLine) this.sliceLine.position.y = value * ALTITUDE_SCALE + 0.08
    if (this.sliceLabel) {
      this.sliceLabel.position.y = value * ALTITUDE_SCALE + 0.2
      this.sliceLabel.element.textContent = `${value.toLocaleString()} FT MSL`
    }
  }

  selectAircraft(hex: string | null) {
    this.selectedAircraftHex = hex
    this.aoiLabel?.classList.remove('airport-label--selected')
    this.airportLabels.forEach((element) => element.classList.remove('airport-label--selected'))
    this.aircraftVisuals.forEach((visual, aircraftHex) => {
      visual.label.classList.toggle('aircraft-label--selected', aircraftHex === hex)
    })
    const visual = hex ? this.aircraftVisuals.get(hex) : null
    if (this.selectedRing && visual) {
      this.selectedRing.position.set(visual.group.position.x, visual.groundY + 0.3, visual.group.position.z)
      this.selectedRing.visible = true
    } else if (this.selectedRing) {
      this.selectedRing.visible = false
    }
  }

  focusAircraft(hex: string) {
    const visual = this.aircraftVisuals.get(hex)
    if (!visual) return
    const target = visual.targetPosition.clone()
    this.moveCamera(target.clone().add(new THREE.Vector3(24, 20, 30)), target)
  }

  selectAirport(id: string | null) {
    this.selectedAircraftHex = null
    this.aoiLabel?.classList.remove('airport-label--selected')
    this.aircraftVisuals.forEach((visual) => visual.label.classList.remove('aircraft-label--selected'))
    this.airportLabels.forEach((element, airportId) => {
      element.classList.toggle('airport-label--selected', airportId === id)
    })
    const group = id ? this.airportGroups.get(id) : null
    if (this.selectedRing && group) {
      this.selectedRing.position.copy(group.position)
      this.selectedRing.position.y += 0.3
      this.selectedRing.visible = true
    } else if (this.selectedRing) {
      this.selectedRing.visible = false
    }
  }

  selectAoi(selected: boolean) {
    this.aoiLabel?.classList.toggle('airport-label--selected', selected)
    if (!selected || !this.aoiGroup) return
    this.selectedAircraftHex = null
    this.airportLabels.forEach((element) => element.classList.remove('airport-label--selected'))
    this.aircraftVisuals.forEach((visual) => visual.label.classList.remove('aircraft-label--selected'))
    if (this.selectedRing) {
      this.selectedRing.position.copy(this.aoiGroup.position)
      this.selectedRing.position.y += 0.3
      this.selectedRing.visible = true
    }
  }

  focusAoi() {
    if (!this.aoiGroup) return
    const target = this.aoiGroup.position.clone().add(new THREE.Vector3(0, 2.4, 0))
    this.moveCamera(target.clone().add(new THREE.Vector3(18, 20, 24)), target)
  }

  focusAirport(id: string) {
    const group = this.airportGroups.get(id)
    if (!group) return
    const target = group.position.clone().add(new THREE.Vector3(0, 2, 0))
    this.moveCamera(target.clone().add(new THREE.Vector3(22, 25, 32)), target)
  }

  setView(view: ViewPreset) {
    const presets: Record<ViewPreset, { position: [number, number, number]; target: [number, number, number] }> = {
      overview: { position: [85, 100, 185], target: [0, 1, 0] },
      valley: { position: [-72, 48, 78], target: [-48, 3, 8] },
      desert: { position: [105, 59, 92], target: [52, 5, -6] },
      top: { position: [0, 218, 0.1], target: [0, 0, 0] },
      traffic: { position: [210, 290, 430], target: [0, 0, 0] },
    }
    const preset = presets[view]
    this.moveCamera(new THREE.Vector3(...preset.position), new THREE.Vector3(...preset.target))
  }

  zoom(direction: 'in' | 'out') {
    const offset = this.camera.position.clone().sub(this.controls.target)
    const factor = direction === 'in' ? 0.78 : 1.28
    const nextLength = THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance)
    offset.setLength(nextLength)
    this.moveCamera(this.controls.target.clone().add(offset), this.controls.target.clone())
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    window.__SCENE_READY__ = false
    delete window.__seek
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material.dispose())
      }
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.labelRenderer.domElement.remove()
  }
}
