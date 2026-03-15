import * as THREE from 'three'

// Sky dome — gradient atmosphere lit from below by the Core
const SKY_VERT = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const SKY_FRAG = `
  uniform float uTime;
  varying vec3 vWorldPos;

  float hash21(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 dir = normalize(vWorldPos);
    float h   = dir.y; // -1 bottom, 1 top

    // === Sky gradient ===
    // horizon: Core-lit cyan glow
    // midsky:  deep indigo/violet
    // zenith:  near-black blue
    vec3 horizon = vec3(0.02, 0.14, 0.22);
    vec3 midsky  = vec3(0.010, 0.040, 0.110);
    vec3 zenith  = vec3(0.004, 0.010, 0.028);

    float t1 = smoothstep(-0.05, 0.25, h);
    float t2 = smoothstep(0.20,  0.75, h);
    vec3 sky = mix(horizon, midsky, t1);
    sky       = mix(sky,    zenith, t2);

    // === Aurora bands ===
    // Horizontal wavering bands across the upper sky
    float aurora = 0.0;
    if (h > 0.05) {
      float band1 = sin(dir.x * 2.5 + uTime * 0.18) * sin(dir.z * 2.1 + uTime * 0.12);
      float band2 = sin(dir.x * 3.8 + uTime * 0.09 + 1.4) * sin(dir.z * 3.2 - uTime * 0.07);
      float mask  = smoothstep(0.05, 0.35, h) * (1.0 - smoothstep(0.55, 0.90, h));
      aurora = (band1 * 0.5 + 0.5) * (band2 * 0.5 + 0.5) * mask;
      aurora = pow(aurora, 2.2) * 0.55;
    }

    // Aurora color: cyan → violet → cyan
    float aPhase = sin(dir.x * 1.2 + uTime * 0.08) * 0.5 + 0.5;
    vec3 aColor  = mix(vec3(0.0, 0.7, 0.9), vec3(0.5, 0.1, 0.9), aPhase);

    sky += aColor * aurora;

    // === Core horizon glow — warm cyan bloom at horizon level ===
    float hglow  = pow(max(0.0, 1.0 - abs(h) * 6.0), 3.0) * 0.18;
    sky += vec3(0.0, 0.35, 0.55) * hglow;

    gl_FragColor = vec4(sky, 1.0);
  }
`

// Stars — bright and numerous, scattered across upper hemisphere
function buildStars() {
  const COUNT  = 3500
  const pos    = new Float32Array(COUNT * 3)
  const sizes  = new Float32Array(COUNT)
  const bright = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    // Random point on sphere, biased upward
    const theta = Math.random() * Math.PI * 2
    const phi   = Math.acos(Math.random() * 1.8 - 0.9) // [-1,0.8] range keeps most above horizon
    const r     = 820

    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta)
    pos[i*3+1] = Math.abs(r * Math.cos(phi)) + 20 // always above ground
    pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta)

    sizes[i]  = 1.5 + Math.random() * 3.5
    bright[i] = 0.4 + Math.random() * 0.6
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position',  new THREE.BufferAttribute(pos,    3))
  geo.setAttribute('aSize',     new THREE.BufferAttribute(sizes,  1))
  geo.setAttribute('aBright',   new THREE.BufferAttribute(bright, 1))

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aSize;
      attribute float aBright;
      uniform   float uTime;
      varying   float vBright;
      void main() {
        vBright = aBright;
        // Subtle twinkle
        float twinkle = sin(uTime * 2.3 + aBright * 17.4) * 0.15 + 0.85;
        gl_PointSize  = aSize * twinkle;
        gl_Position   = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vBright;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = 1.0 - smoothstep(0.0, 1.0, d);
        a = pow(a, 1.6);
        // Mix cold white + faint cyan
        vec3 col = mix(vec3(0.7, 0.85, 1.0), vec3(0.4, 0.9, 1.0), vBright * 0.3);
        gl_FragColor = vec4(col * vBright, a * vBright);
      }
    `,
    uniforms:    { uTime: { value: 0 } },
    transparent: true,
    blending:    THREE.AdditiveBlending,
    depthWrite:  false
  })

  return new THREE.Points(geo, mat)
}

export function createSky(scene) {
  // Sky dome — large, inside-facing
  const skyGeo = new THREE.SphereGeometry(900, 32, 16)
  const skyMat = new THREE.ShaderMaterial({
    vertexShader:   SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { uTime: { value: 0 } },
    side:        THREE.BackSide,
    depthWrite:  false
  })
  const skyDome = new THREE.Mesh(skyGeo, skyMat)
  scene.add(skyDome)

  // Stars
  const stars = buildStars()
  scene.add(stars)

  return {
    update(t) {
      skyMat.uniforms.uTime.value             = t
      stars.material.uniforms.uTime.value     = t
    }
  }
}
