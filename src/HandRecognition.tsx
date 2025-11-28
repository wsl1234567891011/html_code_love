import { useEffect, useRef } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useStore } from './store'

function getDistance(p1: {x:number, y:number}, p2: {x:number, y:number}) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export const HandRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setHandData = useStore((state) => state.setHandData)

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null
    let animationFrameId: number
    let isLooping = true 

    const setup = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        )
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5, 
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" }
        })
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current!.play()
            predictWebcam()
          }
        }
      } catch (error) {
        console.error("🚨:", error)
      }
    }

    const predictWebcam = () => {
      if (!isLooping) return
      
      const video = videoRef.current
      const canvas = canvasRef.current
      
      if (handLandmarker && video && video.readyState >= 2 && canvas) {
        if (canvas.width !== video.videoWidth) {
           canvas.width = video.videoWidth
           canvas.height = video.videoHeight
        }
        
        const startTimeMs = performance.now()
        const results = handLandmarker.detectForVideo(video, startTimeMs)
        const ctx = canvas.getContext('2d')

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          setHandData('left', null)
          setHandData('right', null)

          if (results.landmarks.length > 0) {
            for (const landmarks of results.landmarks) {
              // --- 1. 绘制科技感骨架 ---
              // 亮青色线条
              ctx.strokeStyle = "#00FFFF" 
              ctx.lineWidth = 1
              const connections = [[0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8], [5,9],[9,10],[10,11],[11,12], [9,13],[13,14],[14,15],[15,16], [13,17],[17,18],[18,19],[19,20], [0,17]];
              ctx.beginPath();
              for (const [start, end] of connections) {
                const p1 = landmarks[start];
                const p2 = landmarks[end];
                ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
              }
              ctx.stroke();

              // 关键点：发光白点
              ctx.fillStyle = "#FFFFFF";
              for (const point of landmarks) {
                ctx.beginPath();
                ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI);
                ctx.fill();
              }

              // --- 2. 逻辑检测 ---
              const wrist = landmarks[0];
              const dIndex = getDistance(landmarks[8], wrist);
              const dMiddle = getDistance(landmarks[12], wrist);
              const dRing = getDistance(landmarks[16], wrist);
              const dPinky = getDistance(landmarks[20], wrist);
              const avgFingertipDist = (dIndex + dMiddle + dRing + dPinky) / 4;
              const handBaseSize = getDistance(landmarks[9], wrist);
              const isFist = avgFingertipDist < (handBaseSize * 1.2);

              const x = landmarks[9].x
              const handType = x < 0.5 ? 'right' : 'left'
              const pinchDist = getDistance(landmarks[8], landmarks[4]);
              const isPinching = pinchDist < 0.05

              setHandData(handType, {
                x: landmarks[9].x,
                y: landmarks[9].y,
                z: handBaseSize, 
                isPinching,
                isFist, 
                gesture: isFist ? 'FIST' : (isPinching ? 'PINCH' : 'OPEN')
              })
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(predictWebcam)
    }

    setup()

    return () => {
      isLooping = false
      cancelAnimationFrame(animationFrameId)
      handLandmarker?.close()
    }
  }, [setHandData])

  return (
    // 🔥 将背景重新显示，作为 HUD 层
    <div style={{ 
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 0, pointerEvents: 'none', backgroundColor: '#000' 
    }}>
      {/* 视频：使用 CSS 滤镜打造赛博义眼视觉 */}
      <video 
        ref={videoRef} 
        playsInline 
        style={{ 
          position: 'absolute', width: '100%', height: '100%',
          objectFit: 'cover', transform: 'scaleX(-1)',
          opacity: 0.3, // 低透明度，不抢主体
          filter: 'grayscale(100%) brightness(0.8) contrast(1.2)' // 黑白高对比风格
        }} 
      />
      {/* 叠加一层网格线，增加科技感 */}
      <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
      }}></div>
      <canvas 
        ref={canvasRef} 
        style={{ position: 'absolute', width: '100%', height: '100%', transform: 'scaleX(-1)' }} 
      />
    </div>
  )
}