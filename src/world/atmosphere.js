import * as THREE from 'three'
import { REGIONS } from '../config/regions.js'

// ── Neural connection arcs ──────────────────────────────────────────────────
// Synaptic connections: Core → each district, and between adjacent districts

const ARC_VERT = `
  attribute float aT;
  attribute float aPhase;
  uniform   float uTime;
  varying   float vBright;
  varying   vec3  vColor;
  uniform   vec3  uColor;

  void main() {
    // Pulse head traveling along the arc
    float pulse     = fract(uTime * 0.28 + aPhase);
    float dist      = abs(aT - pulse);
    dist            = min(dist, 1.0 - dist); // wrap around
    float brightness = exp(-dist * 18.0) + 0.06;

    vBright     = brightness;
    vColor      = uColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 2.0;
  }
`

const ARC_FRAG = `
  varying float vBright;
  varying vec3  vColor;
  void main() {
    gl_FragColor = vec4(vColor * vBright, vBright * 0.85);
  }
`

function makeArc(p0, p1, color, phase) {
  const SAMPLES = 100

  // Control point: midpoint elevated
  const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5)
  const dist = p0.distanceTo(p1)
  mid.y += dist * 0.35 + 30  // arc height proportional to distance

  const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1)
  const pts   = curve.getPoints(SAMPLES)

  const positions = new Float32Array(pts.length * 3)
  const tVals     = new Float32Array(pts.length)
  const phases    = new Float32Array(pts.length)

  pts.forEach((p, i) => {
    positions[i*3]   = p.x
    positions[i*3+1] = p.y
    positions[i*3+2] = p.z
    tVals[i]         = i / (pts.length - 1)
    phases[i]        = phase
  })

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aT',       new THREE.BufferAttribute(tVals, 1))
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1))

  const r = ((color >> 16) & 0xff) / 255
  const g = ((color >>  8) & 0xff) / 255
  const b = ((color >>  0) & 0xff) / 255

  const mat = new THREE.ShaderMaterial({
    vertexShader:   ARC_VERT,
    fragmentShader: ARC_FRAG,
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Vector3(r, g, b) }
    },
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false
  })

  return new THREE.Line(geo, mat)
}

function buildArcs(scene) {
  const arcs = []
  const core = new THREE.Vector3(0, 28, 0)

  // Core → each district
  REGIONS.forEach((reg, i) => {
    const dst = new THREE.Vector3(reg.x, 2, reg.z)
    const arc = makeArc(core, dst, reg.color, i / REGIONS.length)
    scene.add(arc)
    arcs.push(arc)
  })

  // District → adjacent district (ring of connections)
  REGIONS.forEach((reg, i) => {
    const next = REGIONS[(i + 1) % REGIONS.length]
    const p0   = new THREE.Vector3(reg.x,  2, reg.z)
    const p1   = new THREE.Vector3(next.x, 2, next.z)
    const col  = i % 2 === 0 ? reg.color : next.color
    const arc  = makeArc(p0, p1, col, (i + 0.5) / REGIONS.length)
    scene.add(arc)
    arcs.push(arc)
  })

  return arcs
}

// ── Ambient world particles ─────────────────────────────────────────────────
// Thousands of points drifting upward through the domain — neural sparks

const PART_VERT = `
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aRadius;
  uniform   float uTime;
  varying   float vAlpha;
  varying   vec3  vCol;
  uniform   vec3  uPalette[4];

  void main() {
    // Drift upward with wraparound
    float t   = mod(aSeed * 100.0 + uTime * aSpeed, 35.0);
    float life = t / 35.0;

    // Horizontal drift
    float angle = aSeed * 6.2831 + uTime * 0.08 * (fract(aSeed * 17.3) - 0.5);
    vec3 pos = position;
    pos.y   += t;
    pos.x   += sin(angle + uTime * 0.3) * 1.8;
    pos.z   += cos(angle + uTime * 0.3) * 1.8;

    // Fade in at birth, fade out near top
    vAlpha = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.75, 1.0, life));
    vAlpha *= 0.55;

    // Color from palette based on seed
    int ci = int(mod(aSeed * 47.3, 4.0));
    if      (ci == 0) vCol = uPalette[0];
    else if (ci == 1) vCol = uPalette[1];
    else if (ci == 2) vCol = uPalette[2];
    else              vCol = uPalette[3];

    gl_PointSize  = 1.5 + fract(aSeed * 33.7) * 2.5;
    gl_Position   = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const PART_FRAG = `
  varying float vAlpha;
  varying vec3  vCol;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(0.3, 1.0, d);
    gl_FragColor = vec4(vCol, a * vAlpha);
  }
`

function buildParticles(scene) {
  const COUNT = 4500
  const pos   = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT)
  const speed = new Float32Array(COUNT)
  const radii = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    // Scatter across domain — denser near Core
    const r     = Math.pow(Math.random(), 0.55) * 340
    const angle = Math.random() * Math.PI * 2
    pos[i*3]   = Math.cos(angle) * r
    pos[i*3+1] = Math.random() * 35       // initial height
    pos[i*3+2] = Math.sin(angle) * r
    seeds[i]   = Math.random()
    speed[i]   = 0.4 + Math.random() * 0.9
    radii[i]   = r
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos,   3))
  geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 1))
  geo.setAttribute('aSpeed',   new THREE.BufferAttribute(speed, 1))
  geo.setAttribute('aRadius',  new THREE.BufferAttribute(radii, 1))

  const mat = new THREE.ShaderMaterial({
    vertexShader:   PART_VERT,
    fragmentShader: PART_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPalette: { value: [
        new THREE.Vector3(0.0, 0.85, 1.0),   // cyan
        new THREE.Vector3(0.4, 0.1,  0.9),   // violet
        new THREE.Vector3(0.9, 0.4,  0.8),   // pink
        new THREE.Vector3(0.8, 0.9,  1.0)    // white-blue
      ]}
    },
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false
  })

  const pts = new THREE.Points(geo, mat)
  scene.add(pts)
  return pts
}

// ── Core plaza rings ────────────────────────────────────────────────────────
// Concentric glowing rings on the ground around the Core — ceremonial space

const RING_VERT = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const RING_FRAG = `
  uniform float uTime;
  uniform float uRadius;
  uniform vec3  uColor;
  varying vec2  vUv;

  void main() {
    // Pulse: ripple outward from center with phase offset by radius
    float phase = uTime * 1.1 - uRadius * 0.04;
    float pulse = pow(sin(phase) * 0.5 + 0.5, 3.0);
    float base  = 0.25;
    float bright = base + (1.0 - base) * pulse;
    gl_FragColor = vec4(uColor * bright, bright * 0.75);
  }
`

function buildPlaza(scene) {
  const radii  = [18, 30, 45, 62, 82, 108]
  const colors = [
    new THREE.Vector3(0.0, 1.0, 1.0),
    new THREE.Vector3(0.2, 0.7, 1.0),
    new THREE.Vector3(0.3, 0.5, 1.0),
    new THREE.Vector3(0.4, 0.3, 0.9),
    new THREE.Vector3(0.2, 0.6, 0.9),
    new THREE.Vector3(0.0, 0.8, 1.0)
  ]
  const rings = []

  radii.forEach((r, i) => {
    const geo = new THREE.RingGeometry(r - 0.4, r + 0.4, 96)
    const mat = new THREE.ShaderMaterial({
      vertexShader:   RING_VERT,
      fragmentShader: RING_FRAG,
      uniforms: {
        uTime:   { value: 0 },
        uRadius: { value: r },
        uColor:  { value: colors[i] }
      },
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
      side:        THREE.DoubleSide
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = 0.05
    scene.add(mesh)
    rings.push({ mesh, mat })
  })

  return rings
}

// ── Public API ──────────────────────────────────────────────────────────────

export function createAtmosphere(scene) {
  const arcs     = buildArcs(scene)
  const particles = buildParticles(scene)
  const rings    = buildPlaza(scene)

  return {
    update(t) {
      arcs.forEach(a => { a.material.uniforms.uTime.value = t })
      particles.material.uniforms.uTime.value = t
      rings.forEach(({ mat }) => { mat.uniforms.uTime.value = t })
    }
  }
}
