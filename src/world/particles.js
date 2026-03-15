import * as THREE from 'three'

// Star field — 2500 points distributed in a hemisphere above the ground
// Color varies slightly: blue-white, cyan-white, pure white

export function createStarField(scene) {
  const COUNT = 2500
  const positions = new Float32Array(COUNT * 3)
  const colors = new Float32Array(COUNT * 3)
  const sizes = new Float32Array(COUNT)

  const starColors = [
    new THREE.Color(1.0, 1.0, 1.0),      // pure white
    new THREE.Color(0.8, 0.9, 1.0),      // blue-white
    new THREE.Color(0.7, 0.95, 1.0),     // cyan-white
    new THREE.Color(0.9, 0.85, 1.0)      // warm white
  ]

  for (let i = 0; i < COUNT; i++) {
    // Spherical distribution, upper hemisphere only
    const phi = Math.acos(1 - Math.random())      // 0 to π/2 (upper half)
    const theta = Math.random() * Math.PI * 2
    const r = 500 + Math.random() * 300

    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20    // above ground
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

    const col = starColors[Math.floor(Math.random() * starColors.length)]
    const brightness = 0.5 + Math.random() * 0.5
    colors[i * 3 + 0] = col.r * brightness
    colors[i * 3 + 1] = col.g * brightness
    colors[i * 3 + 2] = col.b * brightness

    sizes[i] = 0.5 + Math.random() * 1.5
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        // Fade distant stars
        float depth = length(mvPos.xyz);
        vAlpha = 1.0 - smoothstep(600.0, 800.0, depth);
        gl_PointSize = size * (400.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = 1.0 - smoothstep(0.3, 1.0, d);
        gl_FragColor = vec4(vColor, alpha * vAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: false
  })

  const stars = new THREE.Points(geo, mat)
  scene.add(stars)

  return {
    update(t) {
      // Very slow drift
      stars.rotation.y = t * 0.00008
    }
  }
}
