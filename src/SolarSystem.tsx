import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars, Grid } from '@react-three/drei'
import * as THREE from 'three'

// 全息行星材质：不使用实体颜色，使用线框
const HolographicMaterial = ({ color }: { color: string }) => (
  <meshBasicMaterial 
    color={color} 
    wireframe={true} // 🔥 关键：线框模式
    transparent 
    opacity={0.3} 
  />
)

// 行星数据
const planetsData = [
  { name: 'Mercury', distance: 10, size: 0.4, color: '#00FFFF', speed: 1.5 },
  { name: 'Venus', distance: 15, size: 0.6, color: '#00FFFF', speed: 1.2 },
  { name: 'Earth', distance: 20, size: 0.7, color: '#0088FF', speed: 1.0 },
  { name: 'Mars', distance: 25, size: 0.5, color: '#FF0055', speed: 0.8 },
  { name: 'Jupiter', distance: 35, size: 1.5, color: '#FF9900', speed: 0.4 },
  { name: 'Saturn', distance: 45, size: 1.2, color: '#FFCC00', speed: 0.3, hasRing: true },
]

const Planet = ({ distance, size, color, speed, hasRing }: any) => {
  const meshRef = useRef<THREE.Mesh>(null!)
  const systemRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    systemRef.current.rotation.y = t * speed * 0.1
    meshRef.current.rotation.y += 0.01
  })

  return (
    <group ref={systemRef}>
      <mesh ref={meshRef} position={[distance, 0, 0]}>
        {/* 这里细分度低一点(16)，线框看起来更像低多边形科技风格 */}
        <sphereGeometry args={[size, 16, 16]} />
        <HolographicMaterial color={color} />
        
        {/* 内部发光核心 */}
        <mesh scale={[0.5, 0.5, 0.5]}>
           <sphereGeometry args={[size, 8, 8]} />
           <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>

        {hasRing && (
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 1.4, size * 2.0, 32]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.2} side={THREE.DoubleSide} />
          </mesh>
        )}
      </mesh>
      
      {/* 轨道线：非常淡 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[distance - 0.05, distance + 0.05, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export const SolarSystem = () => {
  return (
    <group position={[0, -8, -20]} rotation={[0.2, 0, 0]} scale={1.2}>
      
      {/* 1. 科技感地面网格 */}
      <Grid 
        position={[0, -2, 0]} 
        args={[100, 100]} 
        cellSize={2} 
        cellThickness={1} 
        cellColor="#004444" 
        sectionSize={10} 
        sectionThickness={1.5}
        sectionColor="#008888" 
        fadeDistance={60} 
      />

      {/* 2. 太阳：全息核心 */}
      <mesh>
        <sphereGeometry args={[4, 24, 24]} />
        <meshBasicMaterial color="#FF5500" wireframe transparent opacity={0.5} />
      </mesh>
      
      {/* 3. 行星 */}
      {planetsData.map((data) => (
        <Planet key={data.name} {...data} />
      ))}

      {/* 4. 背景：数字星尘 */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
    </group>
  )
}