import * as THREE from 'three'
import { FOG_COLOR } from '../config/regions.js'

export function createScene() {
  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x010408)   // very dark, sky dome covers everything
  scene.fog = new THREE.FogExp2(0x030a18, 0.0022) // deep indigo fog

  // Camera — eye height 1.7
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1200
  )
  camera.position.set(0, 1.7, 12)

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.9
  document.body.appendChild(renderer.domElement)

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  return { scene, camera, renderer }
}
