import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { HeartParticles } from './HeartParticles'
import { HandRecognition } from './HandRecognition'
import { SolarSystem } from './SolarSystem' // 👈 引入新组件
import { useStore } from './store'

// 调试 UI (改成半透明白色，适应宇宙背景)
const DebugOverlay = () => {
  const { leftHand, rightHand } = useStore()
  const getStatus = (hand: any) => {
    if (!hand) return 'SEARCHING...'
    return `DETECTED [${hand.isFist ? '✊ FIST' : '🖐️ OPEN'}]`
  }
  
  return (
    <div style={{
      position: 'absolute', top: 20, left: 20, color: 'rgba(255, 255, 255, 0.6)', 
      fontFamily: 'monospace', zIndex: 20, pointerEvents: 'none', fontSize: '14px'
    }}>
      <h3>🪐 COSMIC LINK STATUS:</h3>
      <div>Left Hand: {getStatus(leftHand)}</div>
      <div>Right Hand: {getStatus(rightHand)}</div>
    </div>
  )
}

function App() {
  return (
    // 将外层背景设为纯黑
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      
      {/* 1. 隐形的视觉识别层 (仍在后台工作) */}
      <HandRecognition />
      
      {/* 2. UI 层 */}
      <DebugOverlay />

      {/* 3. 3D 渲染层 */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
        <Canvas
          camera={{ position: [0, 2, 10], fov: 50 }} // 调整相机角度，看得更广
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          {/* 将画布背景设为黑色，与星空融合 */}
          <color attach="background" args={['#000000']} />
          
          <OrbitControls makeDefault enableZoom={false} enablePan={false} />
          
          {/* 🔥 背景：太阳系 */}
          <SolarSystem />

          {/* 🔥 前景：爱心粒子 (保持你的控制逻辑不变) */}
          <HeartParticles />
        </Canvas>
      </div>
    </div>
  )
}

export default App