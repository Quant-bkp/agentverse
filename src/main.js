import * as THREE from 'three'
import { createScene } from './world/scene.js'
import { createEnvironment } from './world/environment.js'
import { createCore } from './world/core.js'
import { createCities } from './world/cities.js'
import { createRoads } from './world/roads.js'
import { createSky } from './world/sky.js'
import { createMovementControls } from './controls/movement.js'
import { REGIONS, ZONE_PROXIMITY_RADIUS } from './config/regions.js'

// ── Scene ───────────────────────────────────────────────────────────────────

const { scene, camera, renderer } = createScene()
const environment = createEnvironment(scene)
const core        = createCore(scene)
const cities      = createCities(scene)
const roads       = createRoads(scene)
const sky         = createSky(scene)
const movement    = createMovementControls(camera, renderer.domElement)

// Start inside PFC Financial District, looking down a main street
// PFC is at world (200, 0, 0) — camera on west side, looking east (+X)
camera.position.set(168, 1.7, 0)
camera.lookAt(240, 1.7, 0)

// ── UI ───────────────────────────────────────────────────────────────────────

const entryEl       = document.getElementById('entry')
const enterBtn      = document.getElementById('enter-btn')
const hudEl         = document.getElementById('hud')
const zoneLabelEl   = document.getElementById('zone-label')
const zoneNameEl    = document.getElementById('zone-name')
const zoneRoleEl    = document.getElementById('zone-role')
const isMobile      = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

enterBtn.addEventListener('click', () => {
  entryEl.classList.add('hidden')
  hudEl.classList.add('visible')
  // Attempt PointerLock synchronously (user gesture required)
  if (!isMobile) movement.lock()
  setTimeout(() => { entryEl.style.display = 'none' }, 850)
})

if (!isMobile) {
  document.addEventListener('click', () => {
    if (hudEl.classList.contains('visible') && !movement.isLocked) {
      movement.lock()
    }
  })
}

// ── Zone proximity ────────────────────────────────────────────────────────────

let currentZone      = null
let zoneLabelTimeout = null

function checkZoneProximity() {
  const pos = camera.position
  let nearest = null
  let nearestDist = Infinity

  REGIONS.forEach(region => {
    const dx = pos.x - region.x
    const dz = pos.z - region.z
    const d  = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) {
      nearestDist = d
      nearest = region
    }
  })

  if (nearestDist < ZONE_PROXIMITY_RADIUS) {
    if (currentZone !== nearest.id) {
      currentZone = nearest.id
      zoneNameEl.textContent = nearest.name
      zoneRoleEl.textContent = nearest.role
      zoneLabelEl.classList.add('visible')
      clearTimeout(zoneLabelTimeout)
    }
  } else {
    if (currentZone !== null) {
      currentZone = null
      clearTimeout(zoneLabelTimeout)
      zoneLabelTimeout = setTimeout(() => zoneLabelEl.classList.remove('visible'), 1200)
    }
  }
}

// ── Animation loop ────────────────────────────────────────────────────────────

const clock = new THREE.Clock()
let frame = 0

function animate() {
  requestAnimationFrame(animate)
  const delta   = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  movement.update(delta)
  environment.update(elapsed)
  core.update(elapsed)
  cities.update(elapsed)
  roads.update(elapsed)
  sky.update(elapsed)

  if (frame % 6 === 0) checkZoneProximity()
  frame++

  renderer.render(scene, camera)
}

animate()
