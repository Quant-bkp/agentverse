import * as THREE from 'three'
import { CORE_COLOR } from '../config/regions.js'

// The Core — the light source of the entire domain
// Every district is lit by what emanates from here

export function createCore(scene) {
  const group = new THREE.Group()

  // Obelisk base — rises from the plaza
  const baseMat = new THREE.MeshBasicMaterial({ color: 0x040810 })
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 5), baseMat)
  base1.position.y = 2
  group.add(base1)
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 10, 3.5), baseMat)
  base2.position.y = 9
  group.add(base2)
  const base3 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8, 1.8), baseMat)
  base3.position.y = 19
  group.add(base3)

  // === ICOSAHEDRON — main crystal ===
  const icoGeo  = new THREE.IcosahedronGeometry(5.5, 1)
  const wireGeo = new THREE.WireframeGeometry(icoGeo)

  const wireMat = new THREE.ShaderMaterial({
    vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime;
      void main() {
        float p = sin(uTime * 0.85) * 0.2 + 0.8;
        gl_FragColor = vec4(0.0, 1.0, 1.0, p);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const wire = new THREE.LineSegments(wireGeo, wireMat)
  wire.position.y = 25
  group.add(wire)

  // Outer shell — larger, slower rotation, dimmer
  const outerGeo = new THREE.IcosahedronGeometry(9, 1)
  const outerWireMat = new THREE.ShaderMaterial({
    vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uTime;
      void main() {
        float p = sin(uTime * 0.4 + 1.2) * 0.15 + 0.35;
        gl_FragColor = vec4(0.0, 0.8, 1.0, p);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const outerWire = new THREE.LineSegments(new THREE.WireframeGeometry(outerGeo), outerWireMat)
  outerWire.position.y = 25
  group.add(outerWire)

  // === CORONA — large glowing sphere ===
  const coronaMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal  = normalize(normalMatrix * normal);
        vec4 mv  = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = 1.0 - abs(dot(vNormal, vViewDir));
        rim = pow(rim, 1.4);
        float pulse = sin(uTime * 0.85 + 0.4) * 0.25 + 0.75;
        float brightness = rim * pulse;
        gl_FragColor = vec4(0.0, brightness * 0.9, brightness, brightness * 0.7);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const corona = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 24), coronaMat)
  corona.position.y = 25
  group.add(corona)

  // Inner fill glow (smaller, brighter)
  const innerGlowMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal  = normalize(normalMatrix * normal);
        vec4 mv  = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = 1.0 - abs(dot(vNormal, vViewDir));
        rim = pow(rim, 1.8);
        float pulse = sin(uTime * 1.1) * 0.3 + 0.7;
        gl_FragColor = vec4(rim * 0.3, rim * pulse, rim, rim * 0.9 * pulse);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16), innerGlowMat)
  innerGlow.position.y = 25
  group.add(innerGlow)

  // === LIGHTS — powerful enough to fill the whole domain ===
  // Primary: strong wide-range light from Core
  const coreLight = new THREE.PointLight(0x00ddff, 6.0, 800)
  coreLight.position.set(0, 25, 0)
  group.add(coreLight)

  // Secondary: fill light slightly offset, softer cyan
  const fillLight = new THREE.PointLight(0x0066cc, 3.0, 600)
  fillLight.position.set(0, 10, 0)
  group.add(fillLight)

  scene.add(group)

  return {
    update(t) {
      const breathe = 1.0 + Math.sin(t * 0.85) * 0.06
      wire.scale.setScalar(breathe)
      corona.scale.setScalar(breathe * 1.05)
      innerGlow.scale.setScalar(breathe)

      wire.rotation.y      = t * 0.12
      outerWire.rotation.y = -t * 0.06
      outerWire.rotation.x = t * 0.03

      const bob = Math.sin(t * 0.7) * 0.6
      wire.position.y      = 25 + bob
      outerWire.position.y = 25 + bob * 0.5
      corona.position.y    = 25 + bob
      innerGlow.position.y = 25 + bob
      coreLight.position.y = 25 + bob

      wireMat.uniforms.uTime.value      = t
      outerWireMat.uniforms.uTime.value = t
      coronaMat.uniforms.uTime.value    = t
      innerGlowMat.uniforms.uTime.value = t
    }
  }
}
