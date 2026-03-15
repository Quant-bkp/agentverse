// Brain region city districts
// Radius 200 from origin — cities are dense enough to feel connected

const RADIUS = 200
const COUNT  = 7

const REGION_DATA = [
  {
    id: 'pfc',
    name: 'Prefrontal Cortex',
    role: 'The Strategist',
    color: 0x88bbff,
    // District character: downtown financial, glass skyscrapers
    minH: 28, maxH: 110,   // floor-based: ~8 to 32 floors
    minBW: 9,  maxBW: 18,  // building street width
    wallColor:    0x0c1218,
    windowColor:  0x99bbdd,
    windowLit:    0.70,
    groundFloor:  0x111a28,
    streetLight:  0xffcc88,
    ambientColor: 0x06101c,
    neon: false, neonColors: []
  },
  {
    id: 'insular',
    name: 'Insular',
    role: 'The Feeler',
    color: 0xff66cc,
    // Arts district: mixed height, vibrant, irregular
    minH: 10, maxH: 32,
    minBW: 7,  maxBW: 14,
    wallColor:    0x160a12,
    windowColor:  0xffaadd,
    windowLit:    0.62,
    groundFloor:  0x220a18,
    streetLight:  0xff88cc,
    ambientColor: 0x1a0614,
    neon: true, neonColors: [0xff44cc, 0xff22aa, 0xee44ff, 0xff6699]
  },
  {
    id: 'amygdala',
    name: 'Amygdala',
    role: 'The Sentinel',
    color: 0xff3311,
    // Emergency zone: concrete, squat, angular
    minH: 8,  maxH: 24,
    minBW: 10, maxBW: 20,
    wallColor:    0x160806,
    windowColor:  0xff7744,
    windowLit:    0.38,
    groundFloor:  0x200a06,
    streetLight:  0xff4422,
    ambientColor: 0x180404,
    neon: true, neonColors: [0xff1100, 0xff3300, 0xff5500]
  },
  {
    id: 'thalamus',
    name: 'Thalamus',
    role: 'The Router',
    color: 0x6677ff,
    // Transit hub: infrastructure, wide blocks, overpasses
    minH: 12, maxH: 42,
    minBW: 8,  maxBW: 16,
    wallColor:    0x08080e,
    windowColor:  0x8899ff,
    windowLit:    0.55,
    groundFloor:  0x0c0c18,
    streetLight:  0x8899ff,
    ambientColor: 0x06061a,
    neon: false, neonColors: []
  },
  {
    id: 'auditory',
    name: 'Auditory / Temporal',
    role: 'The Listener',
    color: 0xaa55ff,
    // Entertainment strip: clubs, theaters, neon
    minH: 10, maxH: 28,
    minBW: 8,  maxBW: 15,
    wallColor:    0x0e0810,
    windowColor:  0xcc99ff,
    windowLit:    0.60,
    groundFloor:  0x160a1c,
    streetLight:  0xbb77ff,
    ambientColor: 0x0c0614,
    neon: true, neonColors: [0xaa33ff, 0x8822ff, 0xcc55ff, 0xff33aa]
  },
  {
    id: 'hippocampus',
    name: 'Hippocampus',
    role: 'The Archivist',
    color: 0xffaa22,
    // Archive district: dense, labyrinthine, old stone + modern vaults
    minH: 12, maxH: 40,
    minBW: 7,  maxBW: 13,
    wallColor:    0x120a04,
    windowColor:  0xffcc66,
    windowLit:    0.52,
    groundFloor:  0x1a0e06,
    streetLight:  0xffaa33,
    ambientColor: 0x140800,
    neon: false, neonColors: []
  },
  {
    id: 'basalganglia',
    name: 'Basal Ganglia',
    role: 'The Habit Engine',
    color: 0x556655,
    // Industrial: warehouses, factories, flat
    minH: 5,  maxH: 16,
    minBW: 12, maxBW: 24,
    wallColor:    0x090c09,
    windowColor:  0x99aa88,
    windowLit:    0.30,
    groundFloor:  0x0c100c,
    streetLight:  0x88aa66,
    ambientColor: 0x050805,
    neon: false, neonColors: []
  }
]

export const REGIONS = REGION_DATA.map((data, i) => {
  const angle = (Math.PI * 2 * i) / COUNT
  return {
    ...data,
    index: i,
    x: Math.cos(angle) * RADIUS,
    z: Math.sin(angle) * RADIUS,
    y: 0,
    angle
  }
})

export const CORE_COLOR = 0x00ffff
export const FOG_COLOR  = 0x000508
export const ZONE_PROXIMITY_RADIUS = 90
