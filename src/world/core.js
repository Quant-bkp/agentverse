import * as THREE from 'three'
import { CORE_COLOR } from '../config/regions.js'

// The Core — my icosahedron form at (0,0,0)
// Breathing wireframe with inner glow

export function createCore(scene) {
  const group = new THREE.Group()
  group.position.set(0, 4.5, 0)

  // — Wireframe icosahedron —
  const icoGeo = new THREE.IcosahedronGeometry(3.5, 1)
  const wireGeo = new THREE.WireframeGeometry(icoGeo)

  const wireMat = new THREE.ShaderMaterial({
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;

      void main() {
        float pulse = sin(uTime * 0.9) * 0.15 + 0.85;
        gl_FragColor = vec4(uColor * pulse, 0.9);
      }
    `,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(CORE_COLOR) }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const wire = new THREE.LineSegments(wireGeo, wireMat)
  group.add(wire)

  // — Inner glow sphere (additive, backside) —
  const glowGeo = new THREE.SphereGeometry(4.2, 16, 16)
  const glowMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-worldPos.xyz);
        gl_Position = projectionMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        float rim = 1.0 - abs(dot(vNormal, vViewDir));
        rim = pow(rim, 2.5);
        float pulse = sin(uTime * 0.9 + 0.3) * 0.2 + 0.8;
        vec3 color = vec3(0.0, 1.0, 1.0);
        gl_FragColor = vec4(color * rim * pulse, rim * 0.35);
      }
    `,
    uniforms: {
      uTime: { value: 0 }
    },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })

  const glow = new THREE.Mesh(glowGeo, glowMat)
  group.add(glow)

  // — Outer ambient glow point light —
  const coreLight = new THREE.PointLight(CORE_COLOR, 2.5, 50)
  coreLight.position.set(0, 0, 0)
  group.add(coreLight)

  // — Second icosahedron outline, slightly larger, rotated —
  const icoGeo2 = new THREE.IcosahedronGeometry(4.0, 1)
  const wireGeo2 = new THREE.WireframeGeometry(icoGeo2)
  const wireMat2 = new THREE.ShaderMaterial({
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      void main() {
        float pulse = sin(uTime * 0.6 + 1.2) * 0.5 + 0.5;
        gl_FragColor = vec4(0.0, 0.6, 0.8, 0.12 + pulse * 0.06);
      }
    `,
    uniforms: {
      uTime: { value: 0 }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const wire2 = new THREE.LineSegments(wireGeo2, wireMat2)
  group.add(wire2)

  scene.add(group)

  return {
    update(t) {
      // Breathing: scale oscillates slightly
      const breathe = 1.0 + Math.sin(t * 0.9) * 0.04
      wire.scale.setScalar(breathe)
      glow.scale.setScalar(breathe * 1.05)
      wire2.rotation.y = t * 0.08
      wire2.rotation.x = t * 0.05

      wireMat.uniforms.uTime.value = t
      glowMat.uniforms.uTime.value = t
      wireMat2.uniforms.uTime.value = t

      // Gentle float
      group.position.y = 4.5 + Math.sin(t * 0.7) * 0.3
    }
  }
}
