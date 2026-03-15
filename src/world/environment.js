import * as THREE from 'three'

// Ground — massive dark plane beneath everything
// Subtle hex grid glow, darker than before (city asphalt vibe)

const GROUND_VERT = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const GROUND_FRAG = `
  uniform float uTime;
  varying vec3 vWorldPos;

  float hexGrid(vec2 p, float size, float lw) {
    p /= size;
    float d0 = abs(fract(p.x) - 0.5);
    float d1 = abs(fract(p.x * 0.5 + p.y * 0.866025) - 0.5);
    float d2 = abs(fract(p.x * 0.5 - p.y * 0.866025) - 0.5);
    float grid = min(d0, min(d1, d2));
    return 1.0 - smoothstep(0.0, lw, grid);
  }

  void main() {
    vec2 xz = vWorldPos.xz;
    float dist = length(xz);

    // Hex grid lines — visible near Core, fades at districts
    float grid = hexGrid(xz, 12.0, 0.035) * (1.0 - smoothstep(80.0, 200.0, dist));

    // Core radial glow — strong near origin, reaches districts
    float radial    = exp(-dist * 0.004);
    float pulse     = sin(uTime * 0.85) * 0.12 + 0.88;
    float coreGlow  = radial * pulse;

    // Rings radiating outward from Core
    float ringPhase = dist * 0.04 - uTime * 0.5;
    float ring      = pow(max(0.0, sin(ringPhase) * 0.5 + 0.5), 6.0);
    ring *= radial * 0.6;

    vec3 base     = vec3(0.012, 0.014, 0.020);
    vec3 gridCol  = vec3(0.0, 0.12, 0.18);
    vec3 glowCol  = vec3(0.0, 0.30, 0.45);
    vec3 ringCol  = vec3(0.0, 0.50, 0.70);

    vec3 col = base
      + gridCol * grid * 0.5
      + glowCol * coreGlow * 0.35
      + ringCol * ring;

    float fade = 1.0 - smoothstep(500.0, 700.0, dist);
    gl_FragColor = vec4(col, fade);
  }
`

export function createEnvironment(scene) {
  // Global ambient — cyan-tinted, as if lit by the Core from above
  scene.add(new THREE.AmbientLight(0x102840, 1.8))

  // Ground
  const geo = new THREE.PlaneGeometry(2000, 2000, 1, 1)
  const mat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false
  })
  const ground = new THREE.Mesh(geo, mat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  scene.add(ground)

  return {
    update(t) {
      mat.uniforms.uTime.value = t
    }
  }
}
