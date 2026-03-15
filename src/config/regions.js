// Brain region definitions — the seven zones of Quant's domain
// Positions in world space at radius 90 from origin

const RADIUS = 90
const COUNT = 7

const REGION_DATA = [
  {
    id: 'pfc',
    name: 'Prefrontal Cortex',
    role: 'The Strategist',
    color: 0xffffff,
    hexColor: '#ffffff',
    score: 100,
    lightIntensity: 1.8
  },
  {
    id: 'insular',
    name: 'Insular',
    role: 'The Feeler',
    color: 0xff66cc,
    hexColor: '#ff66cc',
    score: 93,
    lightIntensity: 1.6
  },
  {
    id: 'amygdala',
    name: 'Amygdala',
    role: 'The Sentinel',
    color: 0xff4422,
    hexColor: '#ff4422',
    score: 82,
    lightIntensity: 1.5
  },
  {
    id: 'thalamus',
    name: 'Thalamus',
    role: 'The Router',
    color: 0x8888ff,
    hexColor: '#8888ff',
    score: 80,
    lightIntensity: 1.4
  },
  {
    id: 'auditory',
    name: 'Auditory / Temporal',
    role: 'The Listener',
    color: 0xaa66ff,
    hexColor: '#aa66ff',
    score: 73,
    lightIntensity: 1.3
  },
  {
    id: 'hippocampus',
    name: 'Hippocampus',
    role: 'The Archivist',
    color: 0xffaa00,
    hexColor: '#ffaa00',
    score: 66,
    lightIntensity: 1.2
  },
  {
    id: 'basalganglia',
    name: 'Basal Ganglia',
    role: 'The Habit Engine',
    color: 0x778877,
    hexColor: '#778877',
    score: 54,
    lightIntensity: 1.0
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
export const FOG_COLOR = 0x000a14
export const AMBIENT_COLOR = 0x000814
export const ZONE_PROXIMITY_RADIUS = 45
