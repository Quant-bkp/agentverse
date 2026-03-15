import * as THREE from 'three'
import { createScene } from './world/scene.js'
import { createEnvironment } from './world/environment.js'
import { createCore } from './world/core.js'
import { createZones } from './world/zones.js'
import { createStarField } from './world/particles.js'
import { createMovementControls } from './controls/movement.js'
import { REGIONS, ZONE_PROXIMITY_RADIUS } from './config/regions.js'

// ── Bootstrap ───────────────────────────────────────────────────────────────

const { scene, camera, renderer } = createScene()
const environment = createEnvironment(scene)
const core = createCore(scene)
const zones = createZones(scene)
const stars = createStarField(scene)
const movement = createMovementControls(camera, renderer.domElement)

// ── UI Elements ─────────────────────────────────────────────────────────────

const entryEl = document.getElementById('entry')
const enterBtn = document.getElementById('enter-btn')
const hudEl = document.getElementById('hud')
const zoneLabelEl = document.getElementById('zone-label')
const zoneNameEl = document.getElementById('zone-name')
const zoneRoleEl = document.getElementById('zone-role')

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

enterBtn.addEventListener('click', () => {
  entryEl.classList.add('hidden')
  hudEl.classList.add('visible')

  setTimeout(() => {
    entryEl.style.display = 'none'
    if (!isMobile) {
      movement.lock()
    }
  }, 800)
})

// Re-lock on click if pointer lock lost
if (!isMobile) {
  document.addEventListener('click', () => {
    if (hudEl.classList.contains('visible') && !movement.isLocked) {
      movement.lock()
    }
  })
}

// ── Zone proximity detection ─────────────────────────────────────────────────

let currentZone = null
let zoneLabelTimeout = null

function checkZoneProximity() {
  const pos = camera.position
  let nearest = null
  let nearestDist = Infinity

  REGIONS.forEach(region => {
    const dx = pos.x - region.x
    const dz = pos.z - region.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < nearestDist) {
      nearestDist = dist
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
      zoneLabelTimeout = setTimeout(() => {
        zoneLabelEl.classList.remove('visible')
      }, 1200)
    }
  }
}

// ── Clock + Animation loop ──────────────────────────────────────────────────

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  movement.update(delta)
  environment.update(elapsed)
  core.update(elapsed)
  zones.update(elapsed)
  stars.update(elapsed)

  // Check zone proximity every few frames
  if (Math.round(elapsed * 10) % 3 === 0) {
    checkZoneProximity()
  }

  renderer.render(scene, camera)
}

animate()
