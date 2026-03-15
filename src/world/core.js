import * as THREE from 'three'
import { CORE_COLOR } from '../config/regions.js'

// The Core — central monument at (0,0,0)
// Crystalline icosahedron above the central plaza
// All roads converge here

export function createCore(scene) {
  const group = new THREE.Group()

  // Monument base — dark obelisk rising from plaza
  const baseMat = new THREE.MeshBasicMaterial({ color: 0x040810 })

  const base1 = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), baseMat)
  base1.position.y = 1.5
  group.add(base1)

  const base2 = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3), baseMat)
  base2.position.y = 8
  group.add(base2)

  const base3 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6, 1.5), baseMat)
  base3.position.y = 16
  group.add(base3)

  // Icosahedron — floating above, breathing
  const icoGeo  = new THREE.IcosahedronGeometry(4, 1)
  const wireGeo = new THREE.WireframeGeometry(icoGeo)

  const wireMat = new THREE.ShaderMaterial({
    vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime;
      void main() {
        float p = sin(uTime * 0.85) * 0.15 + 0.85;
        gl_FragColor = vec4(0.0, 1.0, 1.0, 0.9 * p);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const wire = new THREE.LineSegments(wireGeo, wireMat)
  wire.position.y = 24
  group.add(wire)

  // Inner glow sphere
  const glowMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = 1.0 - abs(dot(vNormal, vViewDir));
        rim = pow(rim, 2.2);
        float p = sin(uTime * 0.85 + 0.4) * 0.2 + 0.8;
        gl_FragColor = vec4(0.0, 1.0, 1.0, rim * 0.4 * p);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const glow = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 16), glowMat)
  glow.position.y = 24
  group.add(glow)

  // Core beacon light
  const coreLight = new THREE.PointLight(CORE_COLOR, 4.0, 80)
  coreLight.position.y = 24
  group.add(coreLight)

  scene.add(group)

  return {
    update(t) {
      const breathe = 1.0 + Math.sin(t * 0.85) * 0.05
      wire.scale.setScalar(breathe)
      glow.scale.setScalar(breathe)
      wire.rotation.y = t * 0.1
      wireMat.uniforms.uTime.value = t
      glowMat.uniforms.uTime.value = t
      wire.position.y = 24 + Math.sin(t * 0.7) * 0.5
      glow.position.y = wire.position.y
      coreLight.position.y = wire.position.y
    }
  }
}
