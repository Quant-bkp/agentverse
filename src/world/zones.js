import * as THREE from 'three'
import { REGIONS } from '../config/regions.js'

// Zone markers — each region gets a distinct geometry reflecting its character
// PFC: ordered lattice tower | Insular: curved arc | Amygdala: sharp obelisk
// Thalamus: ring structure | Auditory: wave stack | Hippocampus: archive column
// Basal Ganglia: low repeated pillars

function createZoneGeometry(region) {
  switch (region.id) {
    case 'pfc':
      return createLattice()
    case 'insular':
      return createArc()
    case 'amygdala':
      return createObelisk()
    case 'thalamus':
      return createRings()
    case 'auditory':
      return createWaveStack()
    case 'hippocampus':
      return createArchiveColumn()
    case 'basalganglia':
      return createPillars()
    default:
      return createDefault()
  }
}

function createLattice() {
  // PFC: ordered grid of vertices connected — planning geometry
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })

  for (let y = 0; y < 4; y++) {
    for (let x = -1; x <= 1; x++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x * 1.2, y * 2, -1.2),
        new THREE.Vector3(x * 1.2, y * 2, 1.2)
      ])
      group.add(new THREE.Line(geo, mat))
    }
    for (let z = -1; z <= 1; z++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.2, y * 2, z * 1.2),
        new THREE.Vector3(1.2, y * 2, z * 1.2)
      ])
      group.add(new THREE.Line(geo, mat))
    }
  }
  // Vertical struts
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x * 1.2, 0, z * 1.2),
        new THREE.Vector3(x * 1.2, 6, z * 1.2)
      ])
      group.add(new THREE.Line(geo, mat))
    }
  }
  return group
}

function createArc() {
  // Insular: curved arc / crescent
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0xff66cc, transparent: true, opacity: 0.75 })
  const pts = []
  for (let i = 0; i <= 32; i++) {
    const t = (i / 32) * Math.PI
    pts.push(new THREE.Vector3(Math.cos(t) * 3, Math.sin(t) * 6, 0))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  group.add(new THREE.Line(geo, mat))
  // Second arc rotated
  const pts2 = []
  for (let i = 0; i <= 32; i++) {
    const t = (i / 32) * Math.PI
    pts2.push(new THREE.Vector3(0, Math.sin(t) * 6, Math.cos(t) * 2.5))
  }
  const geo2 = new THREE.BufferGeometry().setFromPoints(pts2)
  group.add(new THREE.Line(geo2, mat))
  return group
}

function createObelisk() {
  // Amygdala: sharp pointed obelisk — alert, angular
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.8 })
  const base = 1.4
  const tip = [new THREE.Vector3(0, 9, 0)]
  const corners = [
    new THREE.Vector3(-base, 0, -base),
    new THREE.Vector3(base, 0, -base),
    new THREE.Vector3(base, 0, base),
    new THREE.Vector3(-base, 0, base)
  ]
  // Base square
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([corners[i], corners[(i + 1) % 4]])
    group.add(new THREE.Line(geo, mat))
  }
  // Edges to tip
  corners.forEach(c => {
    const geo = new THREE.BufferGeometry().setFromPoints([c, tip[0]])
    group.add(new THREE.Line(geo, mat))
  })
  // Mid ring
  const mid = corners.map(c => c.clone().lerp(tip[0], 0.4))
  for (let i = 0; i < 4; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([mid[i], mid[(i + 1) % 4]])
    group.add(new THREE.Line(geo, mat))
  }
  return group
}

function createRings() {
  // Thalamus: concentric rings — routing, hub
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.7 })
  const radii = [1.5, 2.5, 3.5]
  const heights = [1, 3, 5]
  radii.forEach((r, i) => {
    const pts = []
    for (let j = 0; j <= 64; j++) {
      const a = (j / 64) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * r, heights[i], Math.sin(a) * r))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    group.add(new THREE.Line(geo, mat))
  })
  // Spokes connecting rings
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 1.5, 1, Math.sin(a) * 1.5),
      new THREE.Vector3(Math.cos(a) * 3.5, 5, Math.sin(a) * 3.5)
    ])
    group.add(new THREE.Line(geo, mat))
  }
  return group
}

function createWaveStack() {
  // Auditory: stacked frequency wave curves
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0xaa66ff, transparent: true, opacity: 0.7 })
  for (let layer = 0; layer < 5; layer++) {
    const pts = []
    const y = layer * 1.4
    const freq = 2 + layer * 0.5
    const amp = 1.5 - layer * 0.2
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2
      pts.push(new THREE.Vector3(
        Math.cos(t) * (2.5 + amp * Math.sin(t * freq)),
        y,
        Math.sin(t) * (2.5 + amp * Math.sin(t * freq))
      ))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    group.add(new THREE.Line(geo, mat))
  }
  return group
}

function createArchiveColumn() {
  // Hippocampus: stacked archive rings with vertical connectors — memory
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.75 })
  const floors = 5
  for (let f = 0; f < floors; f++) {
    const y = f * 1.6
    const r = 2.2 - f * 0.15
    const pts = []
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    group.add(new THREE.Line(geo, mat))
  }
  // Vertical ribs
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2),
      new THREE.Vector3(Math.cos(a) * 1.5, (floors - 1) * 1.6, Math.sin(a) * 1.5)
    ])
    group.add(new THREE.Line(geo, mat))
  }
  return group
}

function createPillars() {
  // Basal Ganglia: low repeated pillars — habit, efficiency
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color: 0x778877, transparent: true, opacity: 0.55 })
  const positions = [
    [-1.5, -1.5], [0, -2], [1.5, -1.5],
    [-2, 0], [2, 0],
    [-1.5, 1.5], [0, 2], [1.5, 1.5]
  ]
  positions.forEach(([px, pz]) => {
    const h = 2.0 + Math.random() * 1.5
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(px, 0, pz),
      new THREE.Vector3(px, h, pz)
    ])
    group.add(new THREE.Line(geo, mat))
    // Cap
    const capPts = []
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2
      capPts.push(new THREE.Vector3(px + Math.cos(a) * 0.2, h, pz + Math.sin(a) * 0.2))
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(capPts), mat))
  })
  return group
}

function createDefault() {
  const group = new THREE.Group()
  const geo = new THREE.BoxGeometry(2, 4, 2)
  const wire = new THREE.WireframeGeometry(geo)
  group.add(new THREE.LineSegments(wire, new THREE.LineBasicMaterial({ color: 0xffffff })))
  return group
}

export function createZones(scene) {
  const zoneObjects = []

  REGIONS.forEach(region => {
    const group = new THREE.Group()
    group.position.set(region.x, 0, region.z)
    group.userData.regionId = region.id

    // Zone geometry
    const zoneGeo = createZoneGeometry(region)
    group.add(zoneGeo)

    // Zone point light
    const light = new THREE.PointLight(region.color, region.lightIntensity * 0.8, 55)
    light.position.set(0, 3, 0)
    group.add(light)

    // Ground glow disk (flat circle)
    const diskGeo = new THREE.CircleGeometry(4.5, 32)
    const diskMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          float ring = 1.0 - smoothstep(0.6, 1.0, dist);
          float pulse = sin(uTime * 1.2 + ${region.index.toFixed(1)}) * 0.15 + 0.85;
          gl_FragColor = vec4(uColor * ring * pulse, ring * 0.35);
        }
      `,
      uniforms: {
        uColor: { value: new THREE.Color(region.color) },
        uTime: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
    const disk = new THREE.Mesh(diskGeo, diskMat)
    disk.rotation.x = -Math.PI / 2
    disk.position.y = 0.02
    group.add(disk)

    scene.add(group)
    zoneObjects.push({ group, diskMat, region, zoneGeo })
  })

  return {
    update(t) {
      zoneObjects.forEach(({ diskMat, group, zoneGeo }) => {
        diskMat.uniforms.uTime.value = t
        // Gentle sway on zone geometry
        zoneGeo.rotation.y = Math.sin(t * 0.2 + group.userData.regionId?.length || 0) * 0.03
      })
    },
    getRegions() {
      return zoneObjects.map(z => ({ position: z.group.position, region: z.region }))
    }
  }
}
