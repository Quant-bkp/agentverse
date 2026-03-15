import * as THREE from 'three'
import { REGIONS } from '../config/regions.js'

// Radial roads connecting each district to the Core
// Plus a ring road connecting all districts

const ROAD_WIDTH = 10

const ROAD_MAT = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec3 asphalt = vec3(0.04, 0.04, 0.055);

      // Center dashes (moving toward core)
      float cx = abs(vUv.x - 0.5);
      float dash = step(0.42, fract(vUv.y * 10.0 - uTime * 0.4));
      asphalt = mix(asphalt, vec3(0.5, 0.42, 0.04), step(cx, 0.016) * dash * 0.8);

      // Edges
      float edge = max(step(vUv.x, 0.05), step(0.95, vUv.x));
      asphalt = mix(asphalt, vec3(0.35), edge * 0.6);

      // Wet gloss
      float gloss = pow(max(0.0, 1.0 - cx * 2.0), 7.0) * 0.14;
      asphalt += gloss;

      gl_FragColor = vec4(asphalt, 1.0);
    }
  `,
  uniforms: {
    uTime: { value: 0 }
  }
})

export function createRoads(scene) {
  const roads = []

  REGIONS.forEach(region => {
    // Road from Core (origin) to district center
    const dx = region.x
    const dz = region.z
    const len = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dz, dx)

    // Leave gap: start 20 from core, end 70 before district center
    const startDist = 18
    const endDist   = len - 80

    if (endDist <= startDist) return

    const roadLen = endDist - startDist
    const midX    = Math.cos(angle) * (startDist + roadLen / 2)
    const midZ    = Math.sin(angle) * (startDist + roadLen / 2)

    const geo  = new THREE.PlaneGeometry(ROAD_WIDTH, roadLen)
    const mesh = new THREE.Mesh(geo, ROAD_MAT)
    mesh.rotation.x = -Math.PI / 2
    mesh.rotation.z = -(angle - Math.PI / 2)
    mesh.position.set(midX, 0.015, midZ)
    scene.add(mesh)
    roads.push(mesh)

    // Street lights along this road (every 30 units)
    const lightCount = Math.floor(roadLen / 30)
    for (let k = 0; k < lightCount; k++) {
      const t   = k / lightCount
      const lx  = Math.cos(angle) * (startDist + t * roadLen)
      const lz  = Math.sin(angle) * (startDist + t * roadLen)
      // Offset to side of road
      const perp = angle + Math.PI / 2
      const plx  = lx + Math.cos(perp) * (ROAD_WIDTH / 2 + 1.5)
      const plz  = lz + Math.sin(perp) * (ROAD_WIDTH / 2 + 1.5)

      // Pole
      scene.add(
        Object.assign(
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 7, 4),
            new THREE.MeshBasicMaterial({ color: 0x222222 })
          ),
          { position: new THREE.Vector3(plx, 3.5, plz) }
        )
      )

      const light = new THREE.PointLight(0xffaa33, 1.4, 30)
      light.position.set(plx, 7, plz)
      scene.add(light)
    }
  })

  // Central plaza ground (dark circle around Core)
  const plazaGeo = new THREE.CircleGeometry(20, 48)
  const plazaMat = new THREE.MeshBasicMaterial({ color: 0x040408 })
  const plaza    = new THREE.Mesh(plazaGeo, plazaMat)
  plaza.rotation.x = -Math.PI / 2
  plaza.position.y = 0.01
  scene.add(plaza)

  // Plaza ring accent
  const ringGeo = new THREE.RingGeometry(17, 18.5, 48)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.03
  scene.add(ring)

  return {
    update(t) {
      ROAD_MAT.uniforms.uTime.value = t
    }
  }
}
