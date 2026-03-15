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

    // Very subtle hex grid — this is now mostly under city streets
    float grid = hexGrid(xz, 12.0, 0.03) * 0.3;

    // Radial glow from Core origin
    float radial = exp(-dist * 0.003) * 0.06;

    vec3 base = vec3(0.015, 0.016, 0.022);
    vec3 col  = base + vec3(0.0, 0.04, 0.06) * grid + vec3(0.0, 0.06, 0.08) * radial;

    float fade = 1.0 - smoothstep(500.0, 700.0, dist);
    gl_FragColor = vec4(col, fade);
  }
`

export function createEnvironment(scene) {
  // Very dim ambient — city at night
  scene.add(new THREE.AmbientLight(0x020408, 1.0))

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
