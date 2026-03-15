/**
 * props.js — City infrastructure layer
 * Parked vehicles, street trees, traffic lights, benches,
 * bus shelters, fire hydrants, business signs.
 *
 * Everything a city needs before its first inhabitant arrives.
 */

import * as THREE from 'three'
import { REGIONS } from '../config/regions.js'

const STEP     = 61    // block stride (must match cities.js)
const ROAD     = 8     // road width
const SIDEWALK = 1.5
const PARK_OFFSET = ROAD / 2 + 0.8  // curb edge where cars park

// ── Business names per district ─────────────────────────────────────────────
const BUSINESSES = {
  pfc:          ['Cortex Capital', 'Neural Analytics', 'Synapse Partners', 'Logic LLC',
                 'PFC Finance', 'Alpha Strategies', 'Precision Law', 'Apex Advisory',
                 'Executive Club', 'Orbital Consulting'],
  insular:      ['The Body Gallery', 'Visceral Café', 'Feelings Boutique', 'Intuition Studio',
                 'Somatic Spa', 'Empathy Bar', 'Raw Sensation', 'Tender Co.'],
  amygdala:     ['Alert & Response', 'Fear Not Medical', 'Crisis Mgmt Co.', 'Threat HQ',
                 'Survival Depot', 'Reflex Training', 'Red Zone Bar'],
  thalamus:     ['Gateway Station', 'Signal Routing Co.', 'Neural Transit', 'Relay Systems',
                 'Thalamic Exchange', 'The Hub Diner'],
  auditory:     ['Bass Frequency', 'Echo Chamber Bar', 'Temporal Lounge', 'Resonance Club',
                 'Cortex Beats', 'Deep Frequency', 'The Waveform'],
  hippocampus:  ['Memory Vaults Inc.', 'Archive & Recall', 'Pattern Storage', 'Episodic Records',
                 'Long Term Storage', 'The Old Quarter'],
  basalganglia: ['Habit Factory', 'Routine Works', 'Motor Control Co.', 'Procedural Sys.',
                 'Automated Works', 'The Grind']
}

// Car colors (muted, realistic night city palette)
const CAR_COLORS = [
  0x1a1a2e, 0x16213e, 0x0f3460, 0x2d2d2d,
  0x1c1c1c, 0x222244, 0x331111, 0x113311,
  0x2a1a0a, 0x111122
]

// ── Canvas sign texture ──────────────────────────────────────────────────────
function makeSignTexture(text, bgHex, fgHex) {
  const W = 256, H = 64
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background with slight border
  ctx.fillStyle = bgHex
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = fgHex
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, W - 4, H - 4)

  // Text
  ctx.fillStyle = fgHex
  ctx.font = `bold ${text.length > 14 ? 18 : 22}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text.toUpperCase(), W / 2, H / 2)

  const tex = new THREE.CanvasTexture(canvas)
  return tex
}

// ── Vehicle ──────────────────────────────────────────────────────────────────
function makeVehicle(color) {
  const group = new THREE.Group()
  const mat   = new THREE.MeshBasicMaterial({ color })

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.35, 2.1), mat)
  body.position.y = 0.68
  group.add(body)

  // Cabin (roof section)
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.85, 1.85),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.7) })
  )
  cabin.position.y = 1.78
  cabin.position.x = -0.2
  group.add(cabin)

  // Windshields (dark glass planes)
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.7 })
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.7), glassMat)
  windshield.position.set(1.08, 1.75, 0)
  windshield.rotation.y = Math.PI / 2
  windshield.rotation.z = 0.22
  group.add(windshield)

  // Wheels (dark cylinders)
  const wheelMat = new THREE.MeshBasicMaterial({ color: 0x111111 })
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.22, 12)
  const wheelPos = [[-1.4, 0.36, 1.05], [1.4, 0.36, 1.05], [-1.4, 0.36, -1.05], [1.4, 0.36, -1.05]]
  wheelPos.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat)
    w.rotation.z = Math.PI / 2
    w.position.set(x, y, z)
    group.add(w)
  })

  // Taillights (red glow)
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff2200 })
  ;[-0.7, 0.7].forEach(z => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.38), taillightMat)
    tl.position.set(-2.15, 0.85, z)
    group.add(tl)
  })

  // Headlights (white)
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xddeeff })
  ;[-0.65, 0.65].forEach(z => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.36), headlightMat)
    hl.position.set(2.15, 0.78, z)
    group.add(hl)
  })

  return group
}

// ── Street tree (crystalline / digital) ─────────────────────────────────────
function makeTree(color) {
  const group = new THREE.Group()

  // Planter box
  const planterMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2a })
  const planter = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), planterMat)
  planter.position.y = 0.25
  group.add(planter)

  // Trunk
  const trunkMat = new THREE.MeshBasicMaterial({ color: 0x0a0f0a })
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.8, 6), trunkMat)
  trunk.position.y = 1.9
  group.add(trunk)

  // Canopy — icosahedron (fits the domain aesthetic)
  const canopyMat = new THREE.MeshBasicMaterial({ color, wireframe: false })
  const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 1), canopyMat)
  canopy.position.y = 3.7
  group.add(canopy)

  // Canopy wireframe glow
  const wireMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(1.6),
    transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending
  })
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.38, 1)), wireMat)
  wire.position.y = 3.7
  group.add(wire)

  return group
}

// ── Traffic light ─────────────────────────────────────────────────────────────
function makeTrafficLight() {
  const group = new THREE.Group()

  const postMat = new THREE.MeshBasicMaterial({ color: 0x222222 })
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 7, 8), postMat)
  post.position.y = 3.5
  group.add(post)

  const boxMat = new THREE.MeshBasicMaterial({ color: 0x111111 })
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.7, 0.42), boxMat)
  box.position.set(0.6, 7.2, 0)
  group.add(box)

  // Arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), postMat)
  arm.position.set(0.3, 7.0, 0)
  group.add(arm)

  const lightColors = [0xff1100, 0xffaa00, 0x00dd44]
  lightColors.forEach((c, i) => {
    const l = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshBasicMaterial({ color: c })
    )
    l.position.set(0.6, 7.65 - i * 0.55, 0.22)
    group.add(l)
  })

  return group
}

// ── Bench ─────────────────────────────────────────────────────────────────────
function makeBench(color) {
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: color || 0x1a1a1a })
  const leg = new THREE.MeshBasicMaterial({ color: 0x333333 })

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.5), mat)
  seat.position.y = 0.48
  group.add(seat)

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), mat)
  back.position.set(0, 0.75, -0.22)
  group.add(back)

  ;[[-0.6, 0.24, 0], [0.6, 0.24, 0]].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.48), leg)
    l.position.set(x, y, z)
    group.add(l)
  })

  return group
}

// ── Fire hydrant ──────────────────────────────────────────────────────────────
function makeHydrant(color) {
  const mat = new THREE.MeshBasicMaterial({ color: color || 0xcc2200 })
  const g   = new THREE.Group()
  g.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.7, 8), mat), { position: new THREE.Vector3(0, 0.35, 0) }))
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 0.22, 8), mat)
  top.position.y = 0.81
  g.add(top)
  return g
}

// ── Bus shelter ───────────────────────────────────────────────────────────────
function makeBusShelter(busNames, bgHex, fgHex) {
  const group = new THREE.Group()
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x223344 })
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.5 })

  // Back panel (glass)
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 0.08), glassMat)
  back.position.set(0, 1.3, 0)
  group.add(back)

  // Side panels
  ;[-1.6, 1.6].forEach(x => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 1.4), glassMat)
    side.position.set(x, 1.3, 0.66)
    group.add(side)
  })

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 1.7), frameMat)
  roof.position.set(0, 2.65, 0.65)
  group.add(roof)

  // Bench inside
  const seatMat = new THREE.MeshBasicMaterial({ color: 0x1a2233 })
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.5), seatMat)
  seat.position.set(0, 0.55, 0.45)
  group.add(seat)

  // Route sign on back
  const signName = busNames[Math.floor(Math.random() * busNames.length)]
  const tex = makeSignTexture(signName, bgHex, fgHex)
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 0.5),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  )
  signMesh.position.set(0, 1.9, 0.06)
  group.add(signMesh)

  return group
}

// ── Business sign (mounted on building face) ─────────────────────────────────
function makeBusinessSign(name, bgHex, fgHex) {
  const tex = makeSignTexture(name, bgHex, fgHex)
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 0.9),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  )
  return mesh
}

// ── District prop placement ───────────────────────────────────────────────────
function populateDistrict(scene, region) {
  const N    = region.id === 'pfc' || region.id === 'basalganglia' ? 4 : 3
  const half = (N * STEP) / 2
  const ox   = region.x
  const oz   = region.z

  const treeColor = new THREE.Color(region.color).multiplyScalar(0.65)
  const treeHex   = treeColor.getHex()
  const busNames  = BUSINESSES[region.id] || ['District Stop']
  const bgHex     = '#' + new THREE.Color(region.color).multiplyScalar(0.15).getHexString()
  const fgHex     = '#' + new THREE.Color(region.color).getHexString()

  // Walk every intersection: N+1 lines in each axis
  for (let ix = 0; ix <= N; ix++) {
    for (let iz = 0; iz <= N; iz++) {
      const lx = -half + ix * STEP  // local X (road center line)
      const lz = -half + iz * STEP  // local Z (road center line)
      const wx = ox + lx
      const wz = oz + lz

      // ── Traffic light at every other intersection ──────────────────
      if ((ix + iz) % 2 === 0) {
        const tl = makeTrafficLight()
        tl.position.set(wx + 1.5, 0, wz + 1.5)
        tl.rotation.y = Math.random() * Math.PI * 2
        scene.add(tl)
      }

      // ── Street tree near intersection ──────────────────────────────
      if (ix < N && iz < N) {
        const tree = makeTree(treeHex)
        tree.position.set(wx + STEP * 0.5 - ROAD * 0.5 - 0.8, 0, wz + 1.2)
        scene.add(tree)
      }

      // ── Bench on sidewalk ──────────────────────────────────────────
      if (ix < N && iz % 2 === 1) {
        const bench = makeBench()
        bench.position.set(wx + STEP * 0.25, 0, wz - ROAD * 0.5 - SIDEWALK + 0.3)
        bench.rotation.y = Math.PI / 2
        scene.add(bench)
      }

      // ── Fire hydrant ───────────────────────────────────────────────
      if (ix < N && iz < N && (ix + iz) % 3 === 0) {
        const hydrant = makeHydrant(region.id === 'amygdala' ? 0xdd0000 : 0xcc5500)
        hydrant.position.set(wx + STEP * 0.5 + ROAD * 0.5 + 0.4, 0, wz + 0.4)
        scene.add(hydrant)
      }
    }
  }

  // ── Parked cars along road edges ────────────────────────────────────
  for (let lane = 0; lane < N; lane++) {
    const laneOffset = -half + lane * STEP + STEP / 2
    const roadEdge1  = -half + lane * STEP  // near-side street center
    const roadEdge2  = -half + (lane + 1) * STEP

    // Cars along X-facing streets (parked on Z± sides)
    for (let pos = -half + 8; pos < half - 8; pos += 9) {
      if (Math.abs(pos - roadEdge1) < 10 || Math.abs(pos - roadEdge2) < 10) continue

      const col = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
      const car = makeVehicle(col)
      car.position.set(ox + pos, 0, oz + laneOffset - PARK_OFFSET)
      car.rotation.y = Math.PI * 0.5 * Math.round(Math.random() * 2)
      scene.add(car)

      if (Math.random() > 0.3) {
        const col2 = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
        const car2 = makeVehicle(col2)
        car2.position.set(ox + pos, 0, oz + laneOffset + PARK_OFFSET)
        car2.rotation.y = Math.random() > 0.5 ? Math.PI : 0
        scene.add(car2)
      }
    }
  }

  // ── Business signs on block faces ────────────────────────────────────
  const names = BUSINESSES[region.id] || []
  let nameIdx = 0

  for (let ix = 0; ix < N; ix++) {
    for (let iz = 0; iz < N; iz++) {
      if (names.length === 0) break
      const bx = ox - half + ix * STEP + STEP / 2
      const bz = oz - half + iz * STEP + STEP / 2

      // Sign on south face of block
      const name = names[nameIdx % names.length]
      nameIdx++
      const sign = makeBusinessSign(name, bgHex, fgHex)
      sign.position.set(bx, 2.8, bz - STEP / 2 + ROAD / 2 + 0.15)
      scene.add(sign)

      // Sign on east face
      if (ix < N - 1) {
        const sign2 = makeBusinessSign(names[nameIdx % names.length], bgHex, fgHex)
        nameIdx++
        sign2.position.set(bx + STEP / 2 - ROAD / 2 - 0.15, 2.8, bz)
        sign2.rotation.y = -Math.PI / 2
        scene.add(sign2)
      }
    }
  }

  // ── Bus shelters — one per district face ──────────────────────────────
  const shelterPositions = [
    [ox - half + 15, oz],
    [ox + half - 15, oz],
    [ox,             oz - half + 15],
    [ox,             oz + half - 15]
  ]
  shelterPositions.forEach(([sx, sz], i) => {
    const shelter = makeBusShelter(busNames, bgHex, fgHex)
    shelter.position.set(sx, 0, sz)
    shelter.rotation.y = (i * Math.PI / 2)
    scene.add(shelter)
  })
}

// ── Public API ──────────────────────────────────────────────────────────────
export function createProps(scene) {
  REGIONS.forEach(region => {
    populateDistrict(scene, region)
  })

  // No per-frame updates needed — all static
  return { update() {} }
}
