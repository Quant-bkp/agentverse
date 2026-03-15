import * as THREE from 'three'
import { AMBIENT_COLOR } from '../config/regions.js'

// ── Ground: infinite dark plane with hex grid GLSL shader ──────────────────

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

  // Three-family hex grid: lines at 0°, 60°, 120°
  // This creates a true hexagonal grid pattern
  float hexGrid(vec2 p, float size, float lineWidth) {
    p /= size;

    float c0 = cos(0.0);   float s0 = sin(0.0);
    float c1 = cos(1.0472);  float s1 = sin(1.0472);   // 60°
    float c2 = cos(2.0944);  float s2 = sin(2.0944);   // 120°

    float d0 = fract(p.x * c0 + p.y * s0) - 0.5;
    float d1 = fract(p.x * c1 + p.y * s1) - 0.5;
    float d2 = fract(p.x * c2 + p.y * s2) - 0.5;

    float l0 = 1.0 - smoothstep(0.0, lineWidth, abs(d0));
    float l1 = 1.0 - smoothstep(0.0, lineWidth, abs(d1));
    float l2 = 1.0 - smoothstep(0.0, lineWidth, abs(d2));

    return max(l0, max(l1, l2));
  }

  void main() {
    vec2 xz = vWorldPos.xz;

    // Distance from origin — radial glow pulse
    float dist = length(xz);
    float radialPulse = sin(dist * 0.04 - uTime * 0.6) * 0.5 + 0.5;
    float radialFade = 1.0 - smoothstep(0.0, 300.0, dist);

    // Hex grid at two scales
    float grid1 = hexGrid(xz, 9.0, 0.04);
    float grid2 = hexGrid(xz, 45.0, 0.025) * 0.4;
    float grid = max(grid1, grid2);

    // Grid color: deep cyan-teal, brighter near origin
    float proximity = 1.0 - smoothstep(0.0, 80.0, dist);
    vec3 gridColor = mix(
      vec3(0.0, 0.08, 0.12),  // distant: dark teal
      vec3(0.0, 0.4, 0.5),    // near origin: brighter cyan
      proximity
    );

    // Pulse the grid slightly
    gridColor *= 0.7 + radialPulse * 0.3 * radialFade;

    // Base ground color — near-black with slight blue
    vec3 baseColor = vec3(0.003, 0.005, 0.012);

    vec3 color = mix(baseColor, gridColor, grid * 0.85);

    // Fog-like fade at edges
    float edgeFade = 1.0 - smoothstep(400.0, 600.0, dist);
    float alpha = edgeFade;

    gl_FragColor = vec4(color, alpha);
  }
`

export function createEnvironment(scene) {
  // Ambient light — very dim blue-dark
  const ambient = new THREE.AmbientLight(AMBIENT_COLOR, 0.8)
  scene.add(ambient)

  // Directional fill — subtle, from above
  const dirLight = new THREE.DirectionalLight(0x001428, 0.4)
  dirLight.position.set(0, 80, 0)
  scene.add(dirLight)

  // Ground plane — large, transparent at edges
  const groundGeo = new THREE.PlaneGeometry(1400, 1400, 1, 1)
  const groundMat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    uniforms: {
      uTime: { value: 0 }
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  })

  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  ground.userData.isGround = true
  scene.add(ground)

  return {
    update(t) {
      groundMat.uniforms.uTime.value = t
    }
  }
}
