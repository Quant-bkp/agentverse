/**
 * cities.js — Real city districts for each brain region
 *
 * Layout: Perimeter-based city blocks. Buildings line street edges.
 * Every block: 4 building faces surrounding a courtyard/interior.
 * Scale: 1 unit = ~1 meter. Floor height = 3.5 units.
 */

import * as THREE from 'three'
import { REGIONS } from '../config/regions.js'

// ── Layout constants ────────────────────────────────────────────────────────

const CELL      = 30    // city block interior dimension (between building fronts)
const BLDG_D    = 10    // building depth (perpendicular to street)
const SIDEWALK  = 1.5   // sidewalk width
const ROAD      = 8     // road width
const STEP      = CELL + BLDG_D * 2 + SIDEWALK * 2 + ROAD
// STEP = 30 + 20 + 3 + 8 = 61 units center-to-center per block

// ── Shaders ─────────────────────────────────────────────────────────────────

const BLDG_VERT = `
  varying vec2  vUv;
  varying vec3  vWorldPos;
  void main() {
    vUv        = uv;
    vWorldPos  = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`

const BLDG_FRAG = `
  uniform vec3  uWall;
  uniform vec3  uGround;
  uniform vec3  uWindow;
  uniform float uLit;

  varying vec2  vUv;
  varying vec3  vWorldPos;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  void main() {
    bool isGroundFloor = vUv.y < 0.12;

    // Street-level warm glow (fake reflected street light from below)
    float streetGlow = pow(max(0.0, 1.0 - vUv.y * 6.0), 2.0) * 0.18;
    vec3 wallBase = isGroundFloor ? uGround : uWall;
    // Lift dark walls slightly so silhouettes read at night
    wallBase = max(wallBase, vec3(0.03, 0.032, 0.04));
    vec3 wall = wallBase + vec3(0.12, 0.08, 0.04) * streetGlow;

    // Floor separation bands
    float floorBand = step(0.988, fract(vUv.y * 9.0));
    wall = mix(wall, wall * 0.4, floorBand * 0.7);

    // Window grid
    float cols = isGroundFloor ? 2.0 : 4.0;
    float rows = isGroundFloor ? 1.0 : 8.0;

    vec2 winGrid = fract(vUv * vec2(cols, rows));
    vec2 cell    = floor(vUv  * vec2(cols, rows));

    float bdrX = isGroundFloor ? 0.09 : 0.13;
    float bdrY = isGroundFloor ? 0.10 : 0.15;
    float inWin = step(bdrX, winGrid.x) * step(winGrid.x, 1.0 - bdrX) *
                  step(bdrY, winGrid.y) * step(winGrid.y, 1.0 - bdrY);

    vec2 seed  = floor(vWorldPos.xz * 0.18) + cell + vec2(3.1, 7.4);
    float lit  = step(1.0 - uLit, hash(seed));
    float brt  = 0.65 + hash(seed + 11.3) * 0.35;

    float groundLit = isGroundFloor ? (lit * step(0.3, hash(seed + 55.0))) : lit;

    // Window color — brighter, slight halo bleed on wall
    vec3 winCol = uWindow * brt;

    // Halo: lit windows bleed light onto surrounding wall area
    float halo = (1.0 - inWin) * lit *
      (smoothstep(0.0, 0.25, winGrid.x) * smoothstep(1.0, 0.75, winGrid.x) *
       smoothstep(0.0, 0.25, winGrid.y) * smoothstep(1.0, 0.75, winGrid.y)) * 0.3;
    wall += uWindow * halo * brt;

    // Strong ambient bleed from all the windows
    wall += uWindow * 0.045;

    vec3 col = mix(wall, winCol, inWin * groundLit);

    // Parapet
    col = mix(col, wallBase * 0.45, step(0.955, vUv.y));

    gl_FragColor = vec4(col, 1.0);
  }
`

const ROAD_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ROAD_FRAG = `
  uniform float uTime;
  varying vec2  vUv;

  void main() {
    vec3 col = vec3(0.045, 0.046, 0.060);

    float cx   = abs(vUv.x - 0.5);
    // Dashed yellow center line
    float dash = step(0.44, fract(vUv.y * 14.0));
    col = mix(col, vec3(0.52, 0.42, 0.04), step(cx, 0.018) * dash * 0.85);

    // White edge lines
    col = mix(col, vec3(0.40), max(step(vUv.x, 0.055), step(0.945, vUv.x)) * 0.75);

    // Wet gloss
    col += pow(max(0.0, 1.0 - cx * 2.0), 7.0) * 0.14;

    gl_FragColor = vec4(col, 1.0);
  }
`

const SIDEWALK_FRAG = `
  varying vec2 vUv;
  void main() {
    vec3 col = vec3(0.065, 0.065, 0.080);
    // Crack lines
    float cx = abs(fract(vUv.x * 6.0) - 0.5);
    float cz = abs(fract(vUv.y * 6.0) - 0.5);
    col *= 1.0 - step(0.47, max(cx, cz)) * 0.25;
    gl_FragColor = vec4(col, 1.0);
  }
`

// ── Material cache (shared per region to save draw calls) ──────────────────

function makeBuildingMat(cfg) {
  return new THREE.ShaderMaterial({
    vertexShader:   BLDG_VERT,
    fragmentShader: BLDG_FRAG,
    uniforms: {
      uWall:   { value: new THREE.Color(cfg.wallColor) },
      uGround: { value: new THREE.Color(cfg.groundFloor) },
      uWindow: { value: new THREE.Color(cfg.windowColor) },
      uLit:    { value: cfg.windowLit }
    }
  })
}

const ROAD_MATS = {}
function roadMat(cfg) {
  if (!ROAD_MATS[cfg.id]) {
    ROAD_MATS[cfg.id] = new THREE.ShaderMaterial({
      vertexShader:   ROAD_VERT,
      fragmentShader: ROAD_FRAG,
      uniforms: { uTime: { value: 0 } }
    })
  }
  return ROAD_MATS[cfg.id]
}

const SIDEWALK_MAT = new THREE.ShaderMaterial({
  vertexShader:   ROAD_VERT,
  fragmentShader: SIDEWALK_FRAG
})

// ── Seeded RNG ────────────────────────────────────────────────────────────

function makeRNG(seed) {
  let s = String(seed).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0x4f2a3b)
  return () => {
    s = (Math.imul(s ^ (s >>> 16), 0x45d9f3b) + 1) | 0
    return (s >>> 0) / 4294967296
  }
}

// ── Building placement helpers ─────────────────────────────────────────────

/**
 * Place buildings along one edge of a city block.
 * @param group   - THREE.Group to add meshes to
 * @param cfg     - region config
 * @param mat     - ShaderMaterial
 * @param rng     - seeded RNG
 * @param start   - start coordinate along street axis
 * @param end     - end coordinate along street axis
 * @param facePos - position perpendicular to street (building front face position)
 * @param axis    - 'x' or 'z' (street runs along this axis)
 * @param inward  - direction from face into block (+1 or -1)
 */
function placeBlockFace(group, cfg, mat, rng, start, end, facePos, axis, inward) {
  const GAP = 0.4    // gap between buildings
  let pos = start

  while (pos < end - 2) {
    const maxW  = Math.min(cfg.maxBW, end - pos - GAP)
    if (maxW < cfg.minBW) break

    const bw    = cfg.minBW + rng() * (maxW - cfg.minBW)
    const bd    = BLDG_D * (0.7 + rng() * 0.4)
    const bh    = cfg.minH + rng() * (cfg.maxH - cfg.minH)
    const bctr  = pos + bw / 2

    let bx, bz, geoW, geoD
    if (axis === 'x') {
      bx   = bctr
      bz   = facePos + inward * (bd / 2)
      geoW = bw; geoD = bd
    } else {
      bx   = facePos + inward * (bd / 2)
      bz   = bctr
      geoW = bd; geoD = bw
    }

    const geo  = new THREE.BoxGeometry(geoW, bh, geoD)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(bx, bh / 2, bz)
    group.add(mesh)

    // Rooftop details on taller buildings
    if (bh > 20 && rng() > 0.45) {
      addRooftop(group, bx, bz, geoW, geoD, bh, cfg, rng)
    }

    pos += bw + GAP
  }
}

function addRooftop(group, cx, cz, w, d, bh, cfg, rng) {
  const darkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.wallColor).offsetHSL(0, 0, 0.04) })

  // AC units
  for (let k = 0; k < Math.floor(rng() * 3) + 1; k++) {
    const uw = 1.2 + rng() * 2.0, ud = 1.0 + rng() * 1.4, uh = 0.7 + rng() * 0.9
    const m  = new THREE.Mesh(new THREE.BoxGeometry(uw, uh, ud), darkMat)
    m.position.set(cx + (rng() - 0.5) * (w - uw), bh + uh / 2, cz + (rng() - 0.5) * (d - ud))
    group.add(m)
  }

  // Antenna (some buildings)
  if (rng() > 0.5) {
    const ah  = 3 + rng() * 6
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, ah, 4), darkMat)
    ant.position.set(cx + (rng() - 0.5) * w * 0.4, bh + ah / 2, cz + (rng() - 0.5) * d * 0.4)
    group.add(ant)
  }

  // Water tower (residential/mixed blocks)
  if (rng() > 0.75) {
    const wr  = 1.2 + rng() * 0.6, wh = 2.5 + rng() * 1.5
    const wt  = new THREE.Mesh(new THREE.CylinderGeometry(wr, wr, wh, 8), darkMat)
    wt.position.set(cx + (rng() - 0.5) * w * 0.3, bh + wh / 2, cz + (rng() - 0.5) * d * 0.3)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(wr + 0.2, wh * 0.5, 8), darkMat)
    roof.position.set(cx + (rng() - 0.5) * w * 0.3, bh + wh * 1.25, cz + (rng() - 0.5) * d * 0.3)
    group.add(wt); group.add(roof)
  }
}

// ── City block ─────────────────────────────────────────────────────────────

function buildBlock(group, cfg, mat, rng, cx, cz) {
  const half = CELL / 2 + BLDG_D / 2 + SIDEWALK

  // North face (+z edge)
  placeBlockFace(group, cfg, mat, rng,
    cx - CELL / 2, cx + CELL / 2, cz + half, 'x', -1)

  // South face (-z edge)
  placeBlockFace(group, cfg, mat, rng,
    cx - CELL / 2, cx + CELL / 2, cz - half, 'x', +1)

  // East face (+x edge)
  placeBlockFace(group, cfg, mat, rng,
    cz - CELL / 2, cz + CELL / 2, cx + half, 'z', -1)

  // West face (-x edge)
  placeBlockFace(group, cfg, mat, rng,
    cz - CELL / 2, cz + CELL / 2, cx - half, 'z', +1)

  // Block interior ground (parking lot / courtyard)
  const interiorGeo = new THREE.PlaneGeometry(CELL - 2, CELL - 2)
  const interiorMat = new THREE.MeshBasicMaterial({ color: 0x040507 })
  const interior    = new THREE.Mesh(interiorGeo, interiorMat)
  interior.rotation.x = -Math.PI / 2
  interior.position.set(cx, 0.01, cz)
  group.add(interior)
}

// ── Road + sidewalk grid ───────────────────────────────────────────────────

function buildRoads(group, cfg, N) {
  const rMat  = roadMat(cfg)
  const swMat = SIDEWALK_MAT
  const span  = N * STEP + ROAD
  const offset = -(N * STEP) / 2

  // Vertical roads (along Z)
  for (let i = 0; i <= N; i++) {
    const x = offset + i * STEP - ROAD / 2
    const rm = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, span), rMat)
    rm.rotation.x = -Math.PI / 2
    rm.position.set(x, 0.02, 0)
    group.add(rm)

    // Sidewalks on both sides
    ;[-1, 1].forEach(side => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(SIDEWALK, span), swMat)
      sw.rotation.x = -Math.PI / 2
      sw.position.set(x + side * (ROAD / 2 + SIDEWALK / 2), 0.03, 0)
      group.add(sw)
    })
  }

  // Horizontal roads (along X)
  for (let j = 0; j <= N; j++) {
    const z = offset + j * STEP - ROAD / 2
    const rm = new THREE.Mesh(new THREE.PlaneGeometry(span, ROAD), rMat)
    rm.rotation.x = -Math.PI / 2
    rm.position.set(0, 0.02, z)
    group.add(rm)

    ;[-1, 1].forEach(side => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(span, SIDEWALK), swMat)
      sw.rotation.x = -Math.PI / 2
      sw.position.set(0, 0.03, z + side * (ROAD / 2 + SIDEWALK / 2))
      group.add(sw)
    })
  }
}

// ── Street lights ──────────────────────────────────────────────────────────

function buildStreetLights(group, cfg, N) {
  const offset = -(N * STEP) / 2
  const poleMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
  const headMat = new THREE.MeshBasicMaterial({ color: cfg.streetLight })

  // Lights at every intersection and midblock
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N; j++) {
      const x = offset + i * STEP - ROAD / 2
      const z = offset + j * STEP - ROAD / 2

      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 7, 5), poleMat)
      pole.position.set(x - ROAD / 2 - 0.8, 3.5, z - ROAD / 2 - 0.8)
      group.add(pole)

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4), headMat)
      head.position.set(x - ROAD / 2 - 0.8 + 1.2, 7.1, z - ROAD / 2 - 0.8)
      group.add(head)

      // Light
      const pt = new THREE.PointLight(cfg.streetLight, 3.5, 40)
      pt.position.set(x - ROAD / 2 - 0.8 + 1.2, 7.0, z - ROAD / 2 - 0.8)
      group.add(pt)
    }
  }
}

// ── Neon signs ─────────────────────────────────────────────────────────────

function addNeonSigns(group, cfg, N, rng) {
  if (!cfg.neon) return
  const offset = -(N * STEP) / 2
  const count  = Math.floor(N * N * 1.5)

  cfg.neonColors.forEach(hexColor => {
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })

    for (let k = 0; k < count / cfg.neonColors.length; k++) {
      const i   = Math.floor(rng() * N)
      const j   = Math.floor(rng() * N)
      const cx  = offset + i * STEP + STEP / 2 - N * STEP / 2
      const cz  = offset + j * STEP + STEP / 2 - N * STEP / 2
      const y   = 2.5 + rng() * 5
      const w   = 2.0 + rng() * 5.0
      const h   = 0.5 + rng() * 1.2
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat)
      const side = rng() > 0.5

      const faceOffset = CELL / 2 + BLDG_D + 0.15
      if (side) {
        sign.position.set(cx + faceOffset, y, cz)
        sign.rotation.y = -Math.PI / 2
      } else {
        sign.position.set(cx, y, cz + faceOffset)
      }
      group.add(sign)

      // Neon point light
      const sl = new THREE.PointLight(hexColor, 0.9, 12)
      sl.position.copy(sign.position)
      group.add(sl)
    }
  })
}

// ── Landmark structure ─────────────────────────────────────────────────────

function buildLandmark(region, rng) {
  const g = new THREE.Group()

  switch (region.id) {

    case 'pfc': {
      // Twin towers — Financial District icon
      ;[-8, 8].forEach((ox, idx) => {
        const h = 100 + idx * 20
        const mat = new THREE.ShaderMaterial({
          vertexShader: BLDG_VERT, fragmentShader: BLDG_FRAG,
          uniforms: {
            uWall:   { value: new THREE.Color(0x0c1828) },
            uGround: { value: new THREE.Color(0x111a28) },
            uWindow: { value: new THREE.Color(0xaaccff) },
            uLit:    { value: 0.80 }
          }
        })
        const tower = new THREE.Mesh(new THREE.BoxGeometry(7, h, 7), mat)
        tower.position.set(ox, h / 2, 0)
        g.add(tower)
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(2.5, 14, 4),
          new THREE.MeshBasicMaterial({ color: 0x88bbff })
        )
        tip.rotation.y = Math.PI / 4
        tip.position.set(ox, h + 7, 0)
        g.add(tip)
      })
      { const _l = new THREE.PointLight(0x88bbff, 3.0, 160); _l.position.set(0, 90, 0); g.add(_l); }
      break
    }

    case 'insular': {
      // The Dome Pavilion — sensory arts center
      const base = new THREE.Mesh(new THREE.CylinderGeometry(12, 13, 4, 16),
        new THREE.MeshBasicMaterial({ color: 0x160a14 }))
      base.position.y = 2; g.add(base)
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x1a0818 })
      )
      dome.position.y = 4; g.add(dome)
      const domeWire = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.SphereGeometry(12.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
        new THREE.LineBasicMaterial({ color: 0xff66cc, transparent: true, opacity: 0.5 })
      )
      domeWire.position.y = 4; g.add(domeWire)
      { const _l = new THREE.PointLight(0xff66cc, 2.5, 100); _l.position.set(0, 14, 0); g.add(_l); }
      break
    }

    case 'amygdala': {
      // Alert Tower — fortress with warning beacon
      const tower = new THREE.Mesh(new THREE.BoxGeometry(10, 36, 10),
        new THREE.MeshBasicMaterial({ color: 0x180806 }))
      tower.position.y = 18; g.add(tower)
      ;[[0, 0], [5, 5], [-5, 5], [5, -5], [-5, -5]].forEach(([ox, oz]) => {
        const turret = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 3),
          new THREE.MeshBasicMaterial({ color: 0x200a08 }))
        turret.position.set(ox, 39, oz); g.add(turret)
      })
      // Warning beacon
      const beacon = new THREE.PointLight(0xff2200, 5.0, 120)
      beacon.position.set(0, 42, 0); g.add(beacon)
      break
    }

    case 'thalamus': {
      // Routing Hub — elevated ring structure
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 40, 10),
        new THREE.MeshBasicMaterial({ color: 0x08080e }))
      shaft.position.y = 20; g.add(shaft)
      ;[10, 20, 30, 38].forEach(y => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.5, 8, 28),
          new THREE.MeshBasicMaterial({ color: 0x6677ff }))
        ring.rotation.x = Math.PI / 2
        ring.position.y = y; g.add(ring)
      })
      // Spokes
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 0.5),
          new THREE.MeshBasicMaterial({ color: 0x334488 }))
        spoke.rotation.y = a
        spoke.position.y = 38; g.add(spoke)
      }
      { const _l = new THREE.PointLight(0x6677ff, 3.0, 120); _l.position.set(0, 40, 0); g.add(_l); }
      break
    }

    case 'auditory': {
      // Concert Hall — wave facade
      const hall = new THREE.Mesh(new THREE.BoxGeometry(24, 16, 20),
        new THREE.MeshBasicMaterial({ color: 0x0e0812 }))
      hall.position.y = 8; g.add(hall)
      // Wave arch over entrance
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(14, 1.5, 8, 20, Math.PI),
        new THREE.MeshBasicMaterial({ color: 0xaa55ff })
      )
      arch.position.y = 16; g.add(arch)
      // Sound wave pillar cluster
      for (let k = 0; k < 7; k++) {
        const t  = (k / 6) * Math.PI
        const ph = 4 + Math.sin(t) * 10
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(2, ph, 2),
          new THREE.MeshBasicMaterial({ color: 0x1a0828 }))
        pillar.position.set(-12 + k * 4, ph / 2 + 16, -10); g.add(pillar)
      }
      { const _l = new THREE.PointLight(0xaa55ff, 3.0, 100); _l.position.set(0, 20, 0); g.add(_l); }
      break
    }

    case 'hippocampus': {
      // Archive Tower — spiraling pagoda (memory levels)
      for (let f = 0; f < 7; f++) {
        const r   = 10 - f * 1.1
        const h   = 5
        const y   = f * (h + 0.8)
        const floor = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.6, h, 12),
          new THREE.MeshBasicMaterial({ color: 0x140a04 }))
        floor.position.y = y + h / 2; g.add(floor)
        const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.6, 0.35, 6, 24),
          new THREE.MeshBasicMaterial({ color: 0xffaa22 }))
        rim.rotation.x = Math.PI / 2
        rim.position.y = y + h; g.add(rim)
      }
      { const _l = new THREE.PointLight(0xffaa22, 2.5, 100); _l.position.set(0, 50, 0); g.add(_l); }
      break
    }

    case 'basalganglia': {
      // Factory complex — chimney stacks + warehouse
      const warehouse = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 22),
        new THREE.MeshBasicMaterial({ color: 0x080c08 }))
      warehouse.position.y = 5; g.add(warehouse)
      ;[-10, 0, 10].forEach((ox, i) => {
        const sh = 28 + i * 6
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, sh, 8),
          new THREE.MeshBasicMaterial({ color: 0x0a0d0a }))
        stack.position.set(ox, sh / 2, -14); g.add(stack)
        const band = new THREE.Mesh(new THREE.TorusGeometry(2, 0.3, 6, 12),
          new THREE.MeshBasicMaterial({ color: 0x334433 }))
        band.rotation.x = Math.PI / 2
        band.position.set(ox, sh - 4, -14); g.add(band)
      })
      { const _l = new THREE.PointLight(0x556655, 1.5, 80); _l.position.set(0, 32, 0); g.add(_l); }
      break
    }
  }

  return g
}

// ── Main city builder ──────────────────────────────────────────────────────

export function createCities(scene) {
  const roadMats = []

  REGIONS.forEach(region => {
    const rng    = makeRNG(region.id)
    const cfg    = region
    const N      = region.id === 'pfc' ? 4 :
                   region.id === 'basalganglia' ? 4 : 3
    const group  = new THREE.Group()
    group.position.set(region.x, 0, region.z)
    group.userData.regionId = region.id

    // Building material (one per district)
    const mat = makeBuildingMat(cfg)

    // Generate city blocks
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const cx = (i - (N - 1) / 2) * STEP
        const cz = (j - (N - 1) / 2) * STEP
        buildBlock(group, cfg, mat, rng, cx, cz)
      }
    }

    // Roads
    buildRoads(group, cfg, N)
    const rm = roadMat(cfg)
    roadMats.push(rm)

    // Street lights
    buildStreetLights(group, cfg, N)

    // Neon signs
    addNeonSigns(group, cfg, N, rng)

    // Landmark — positioned at open area between blocks, slightly forward
    const landmark = buildLandmark(region, rng)
    const landmarkOffset = -(N * STEP) / 2 - 20
    landmark.position.set(0, 0, landmarkOffset)
    group.add(landmark)

    // District ambient light — high and wide, tints the whole district
    const ambient = new THREE.PointLight(region.color, 1.2, 350)
    ambient.position.set(0, 60, 0)
    group.add(ambient)

    scene.add(group)
  })

  return {
    update(t) {
      roadMats.forEach(m => { m.uniforms.uTime.value = t })
    }
  }
}
