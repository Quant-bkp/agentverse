import * as THREE from 'three'

// Ground — massive dark plane beneath everything
// Subtle hex grid glow, darker than before (city asphalt vibe)

const GROUND_VERT = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const GROUND_FRAG = `
  uniform float uTime;
  varying vec3 vWorldPos;

  float hexGrid(vec2 p, float size, float lw) {
    p /= size;
    float d0 = abs(fract(p.x) - 0.5);
    float d1 = abs(fract(p.x * 0.5 + p.y * 0.866025) - 0.5);
    float d2 = abs(fract(p.x * 0.5 - p.y * 0.866025) - 0.5);
    float grid = min(d0, min(d1, d2));
    return 1.0 - smoothstep(0.0, lw, grid);
  }

  // Angle to one of 7 district directions — returns 0..1 proximity
  float districtSpoke(vec2 xz, float angle) {
    vec2 dir   = vec2(cos(angle), sin(angle));
    vec2 norm  = normalize(xz);
    float dot_ = max(0.0, dot(norm, dir));
    // Angular width of spoke (narrower = sharper circuit trace)
    return pow(dot_, 60.0);
  }

  void main() {
    vec2  xz   = vWorldPos.xz;
    float dist = length(xz);

    // Hex grid — visible only near Core
    float grid = hexGrid(xz, 12.0, 0.032) * (1.0 - smoothstep(60.0, 160.0, dist));

    // Core radial glow
    float radial    = exp(-dist * 0.0038);
    float pulse     = sin(uTime * 0.85) * 0.12 + 0.88;
    float coreGlow  = radial * pulse;

    // Expanding rings from Core
    float ringPhase = dist * 0.038 - uTime * 0.45;
    float ring      = pow(max(0.0, sin(ringPhase) * 0.5 + 0.5), 7.0);
    ring *= exp(-dist * 0.006) * 0.8;

    // Circuit traces — 7 spokes toward each brain district (unrolled for iOS compat)
    float spoke = 0.0;
    const float PI2_7 = 0.8975979; // 2*PI/7
    #define SPOKE(idx) { \
      float ang = float(idx) * PI2_7; \
      float s   = districtSpoke(xz, ang); \
      float sp  = dist * 0.03 - uTime * 0.6 + float(idx) * 0.9; \
      float fl  = pow(max(0.0, sin(sp) * 0.5 + 0.5), 5.0); \
      spoke    += s * (0.15 + fl * 0.6); \
    }
    SPOKE(0) SPOKE(1) SPOKE(2) SPOKE(3) SPOKE(4) SPOKE(5) SPOKE(6)
    #undef SPOKE
    spoke *= (1.0 - smoothstep(80.0, 220.0, dist)) * 0.7;

    vec3 base      = vec3(0.010, 0.013, 0.020);
    vec3 gridCol   = vec3(0.00, 0.15, 0.22);
    vec3 glowCol   = vec3(0.00, 0.28, 0.44);
    vec3 ringCol   = vec3(0.00, 0.55, 0.78);
    vec3 spokeCol  = vec3(0.10, 0.65, 0.90);

    vec3 col = base
      + gridCol  * grid * 0.5
      + glowCol  * coreGlow * 0.30
      + ringCol  * ring
      + spokeCol * spoke;

    float fade = 1.0 - smoothstep(500.0, 700.0, dist);
    gl_FragColor = vec4(col, fade);
  }
`

export function createEnvironment(scene) {
  // Global ambient — cyan-tinted, as if lit by the Core from above
  scene.add(new THREE.AmbientLight(0x102840, 1.8))

  // Ground
  const geo = new THREE.PlaneGeometry(2000, 2000, 1, 1)
  const mat = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERT,
    fragmentShader: GROUND_FRAG,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false
  })
  const ground = new THREE.Mesh(geo, mat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  scene.add(ground)

  return {
    update(t) {
      mat.uniforms.uTime.value = t
    }
  }
}
