import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from './store' 

// --- 1. Vertex Shader ---
const vertexShader = `
  attribute float aScale;
  attribute float aLife;
  attribute vec3 aRandom;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uExplode; 

  varying vec3 vPosition;
  varying float vLife;
  varying float vExplodeFactor;

  // 噪波算法
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    // --- 💓 心跳调节 ---
    // 🔥 修改点：频率 6.0，幅度 0.08 (柔和且清晰)
    float beatFreq = 6.0; 
    float beatAmp = 0.08; 
    
    float beatFactor = smoothstep(0.3, 0.0, uExplode); 
    float scale = 1.0 + beatFactor * beatAmp * sin(uTime * beatFreq);
    vec3 beatPos = position * scale;

    vec4 modelPosition = modelMatrix * vec4(beatPos, 1.0);
    
    float explodeCurve = pow(uExplode, 0.5); 

    // 湍流
    float noiseX = snoise(modelPosition.xyz * 0.1 + vec3(uTime * 0.5, 0.0, 0.0));
    float noiseY = snoise(modelPosition.xyz * 0.1 + vec3(0.0, uTime * 0.5, 0.0));
    float noiseZ = snoise(modelPosition.xyz * 0.1 + vec3(0.0, 0.0, uTime * 0.5));
    vec3 noiseFlow = vec3(noiseX, noiseY, noiseZ) * explodeCurve * 8.0;

    vec3 explosionDir = normalize(position + aRandom * 0.5); 
    float explosionDist = explodeCurve * 60.0;
    
    modelPosition.xyz += explosionDir * explosionDist + noiseFlow;

    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    // 粒子大小
    float sizeMix = mix(220.0, 60.0, explodeCurve);
    gl_PointSize = aScale * sizeMix * uPixelRatio;
    gl_PointSize *= (1.0 / -viewPosition.z);

    vPosition = modelPosition.xyz;
    vLife = aLife;
    vExplodeFactor = explodeCurve;
  }
`

// --- 2. Fragment Shader ---
const fragmentShader = `
  varying vec3 vPosition;
  varying float vLife;
  varying float vExplodeFactor;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uExplode;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    float strength = 0.1 / (dist + 0.05) - 0.1; 
    strength = clamp(strength, 0.0, 1.0);

    float colorMix = length(vPosition) * 0.03;
    vec3 baseColor = mix(uColorA, uColorB, colorMix);
    
    vec3 flashColor = vec3(1.0, 0.95, 0.8); 
    float flashIntensity = smoothstep(0.0, 0.4, vExplodeFactor) * smoothstep(1.0, 0.6, vExplodeFactor) * 2.0;
    
    vec3 finalColor = baseColor + flashColor * flashIntensity;

    float breathe = sin(uTime * 3.0) * 0.2 + 0.8;
    float alpha = strength * vLife * breathe;

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(finalColor, alpha);
  }
`

const CONFIG = {
  count: 60000, 
  colorA: '#FF0055',
  colorB: '#00FFFF',
}

function mapExplosion(handSize: number) {
  const FAR = 0.08;
  const CLOSE = 0.22;
  const size = THREE.MathUtils.clamp(handSize, FAR, CLOSE);
  return THREE.MathUtils.mapLinear(size, FAR, CLOSE, 1.0, 0.0);
}

export const HeartParticles = () => {
  const points = useRef<THREE.Points>(null!)
  const smoothHand = useRef(new THREE.Vector3(0, 0, 0))
  const smoothExplode = useRef(0)

  const { positions, scales, lifes, randoms } = useMemo(() => {
    const positions = new Float32Array(CONFIG.count * 3)
    const scales = new Float32Array(CONFIG.count)
    const lifes = new Float32Array(CONFIG.count)
    const randoms = new Float32Array(CONFIG.count * 3)

    for (let i = 0; i < CONFIG.count; i++) {
      const i3 = i * 3
      const t = Math.random() * Math.PI * 2
      // 保持合适的尺寸 0.15
      const r = 0.15 + Math.random() * 0.02 
      let x = 16 * Math.pow(Math.sin(t), 3)
      let y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)
      let z = (Math.random() - 0.5) * 4
      x *= r; y *= r; z *= r;
      positions[i3] = x; positions[i3 + 1] = y; positions[i3 + 2] = z;
      scales[i] = Math.random()
      lifes[i] = 0.4 + Math.random() * 0.6
      randoms[i3] = (Math.random() - 0.5) * 4.0
      randoms[i3 + 1] = (Math.random() - 0.5) * 4.0
      randoms[i3 + 2] = (Math.random() - 0.5) * 4.0
    }
    return { positions, scales, lifes, randoms }
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uColorA: { value: new THREE.Color(CONFIG.colorA) },
    uColorB: { value: new THREE.Color(CONFIG.colorB) },
    uExplode: { value: 0.0 }, 
  }), [])

  useFrame((state) => {
    if (!points.current) return
    const material = points.current.material as THREE.ShaderMaterial
    material.uniforms.uTime.value = state.clock.elapsedTime

    const { rightHand, leftHand } = useStore.getState()
    const activeHand = rightHand || leftHand

    let targetExplode = 0
    let targetX = 0
    let targetY = 0
    let targetRotationSpeed = 0.002

    if (activeHand) {
      targetX = (activeHand.x - 0.5) * -15 
      targetY = (activeHand.y - 0.5) * -10
      targetRotationSpeed = (activeHand.x - 0.5) * 0.08
      targetExplode = mapExplosion(activeHand.z);
    } else {
      targetExplode = 0.0;
    }

    smoothHand.current.x += (targetX - smoothHand.current.x) * 0.05
    smoothHand.current.y += (targetY - smoothHand.current.y) * 0.05
    points.current.position.x = smoothHand.current.x
    points.current.position.y = smoothHand.current.y

    const lerpSpeed = targetExplode < smoothExplode.current ? 0.08 : 0.02; 
    smoothExplode.current += (targetExplode - smoothExplode.current) * lerpSpeed
    
    material.uniforms.uExplode.value = smoothExplode.current

    points.current.rotation.y += targetRotationSpeed

    const targetObjectScale = THREE.MathUtils.mapLinear(
      Math.min(smoothExplode.current, 1.0), 0.0, 1.0, 1.0, 1.5
    );
    const currentScale = points.current.scale.x;
    points.current.scale.set(
      currentScale + (targetObjectScale - currentScale) * 0.05,
      currentScale + (targetObjectScale - currentScale) * 0.05,
      currentScale + (targetObjectScale - currentScale) * 0.05
    );
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
        <bufferAttribute attach="attributes-aLife" args={[lifes, 1]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}