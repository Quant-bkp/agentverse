import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'

// WASD + PointerLock for desktop
// Touch joystick + swipe look for mobile

const MOVE_SPEED = 10
const RUN_SPEED = 20
const TOUCH_LOOK_SENS = 0.003

export function createMovementControls(camera, domElement) {
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

  // Key state
  const keys = { w: false, a: false, s: false, d: false, shift: false, space: false }
  const velocity = new THREE.Vector3()
  const direction = new THREE.Vector3()

  // — Desktop: PointerLockControls —
  let plc = null
  let plcActive = false

  if (!isMobile) {
    plc = new PointerLockControls(camera, domElement)

    document.addEventListener('keydown', e => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.w = true; break
        case 'KeyA': case 'ArrowLeft':  keys.a = true; break
        case 'KeyS': case 'ArrowDown':  keys.s = true; break
        case 'KeyD': case 'ArrowRight': keys.d = true; break
        case 'ShiftLeft': case 'ShiftRight': keys.shift = true; break
        case 'Space': keys.space = true; break
      }
    })

    document.addEventListener('keyup', e => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.w = false; break
        case 'KeyA': case 'ArrowLeft':  keys.a = false; break
        case 'KeyS': case 'ArrowDown':  keys.s = false; break
        case 'KeyD': case 'ArrowRight': keys.d = false; break
        case 'ShiftLeft': case 'ShiftRight': keys.shift = false; break
        case 'Space': keys.space = false; break
      }
    })

    plc.addEventListener('lock', () => { plcActive = true })
    plc.addEventListener('unlock', () => { plcActive = false })
  }

  // — Touch: virtual joystick + swipe look —
  const touch = {
    joy: { active: false, startX: 0, startY: 0, dx: 0, dy: 0 },
    look: { active: false, lastX: 0, lastY: 0 }
  }

  const euler = new THREE.Euler(0, 0, 0, 'YXZ')

  if (isMobile) {
    document.body.classList.add('touch-active')

    const joyZone = document.getElementById('joystick-zone')
    const lookZone = document.getElementById('look-zone')
    const dot = document.getElementById('joystick-dot')
    const ring = document.getElementById('joystick-ring')

    if (joyZone) {
      joyZone.addEventListener('touchstart', e => {
        const t = e.changedTouches[0]
        touch.joy.active = true
        touch.joy.startX = t.clientX
        touch.joy.startY = t.clientY
        touch.joy.dx = 0
        touch.joy.dy = 0
        e.preventDefault()
      }, { passive: false })

      joyZone.addEventListener('touchmove', e => {
        const t = e.changedTouches[0]
        const dx = t.clientX - touch.joy.startX
        const dy = t.clientY - touch.joy.startY
        const len = Math.sqrt(dx * dx + dy * dy)
        const maxR = 40
        const clamped = Math.min(len, maxR)
        touch.joy.dx = (dx / len) * (clamped / maxR)
        touch.joy.dy = (dy / len) * (clamped / maxR)

        if (dot) {
          dot.style.transform = `translate(calc(-50% + ${touch.joy.dx * maxR}px), calc(-50% + ${touch.joy.dy * maxR}px))`
        }
        e.preventDefault()
      }, { passive: false })

      joyZone.addEventListener('touchend', () => {
        touch.joy.active = false
        touch.joy.dx = 0
        touch.joy.dy = 0
        if (dot) dot.style.transform = 'translate(-50%, -50%)'
      })
    }

    if (lookZone) {
      lookZone.addEventListener('touchstart', e => {
        const t = e.changedTouches[0]
        touch.look.active = true
        touch.look.lastX = t.clientX
        touch.look.lastY = t.clientY
        e.preventDefault()
      }, { passive: false })

      lookZone.addEventListener('touchmove', e => {
        const t = e.changedTouches[0]
        const dx = t.clientX - touch.look.lastX
        const dy = t.clientY - touch.look.lastY
        euler.setFromQuaternion(camera.quaternion)
        euler.y -= dx * TOUCH_LOOK_SENS
        euler.x -= dy * TOUCH_LOOK_SENS
        euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x))
        camera.quaternion.setFromEuler(euler)
        touch.look.lastX = t.clientX
        touch.look.lastY = t.clientY
        e.preventDefault()
      }, { passive: false })

      lookZone.addEventListener('touchend', () => {
        touch.look.active = false
      })
    }
  }

  const clock = new THREE.Clock()

  return {
    get controls() { return plc },
    get isLocked() { return plcActive },

    lock() {
      if (plc) plc.lock()
    },

    update(delta) {
      const speed = keys.shift ? RUN_SPEED : MOVE_SPEED

      if (plc && plcActive) {
        // Desktop movement
        direction.set(
          (keys.d ? 1 : 0) - (keys.a ? 1 : 0),
          0,
          (keys.s ? 1 : 0) - (keys.w ? 1 : 0)
        )
        if (direction.length() > 0) direction.normalize()

        velocity.x -= velocity.x * 8.0 * delta
        velocity.z -= velocity.z * 8.0 * delta

        velocity.x += direction.x * speed * 6 * delta
        velocity.z += direction.z * speed * 6 * delta

        plc.moveRight(velocity.x * delta)
        plc.moveForward(-velocity.z * delta)

        // Keep eye at constant height
        camera.position.y = 1.7
      } else if (isMobile && touch.joy.active) {
        // Touch movement
        euler.setFromQuaternion(camera.quaternion)
        const forward = new THREE.Vector3(-Math.sin(euler.y), 0, -Math.cos(euler.y))
        const right = new THREE.Vector3(Math.cos(euler.y), 0, -Math.sin(euler.y))

        forward.multiplyScalar(-touch.joy.dy * speed * delta)
        right.multiplyScalar(touch.joy.dx * speed * delta)

        camera.position.add(forward).add(right)
        camera.position.y = 1.7
      }
    }
  }
}
