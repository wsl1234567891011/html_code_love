import { create } from 'zustand'

// 定义手的数据结构
type HandData = {
  x: number; y: number; z: number // 坐标和大小
  isPinching: boolean             // 捏合 (拇指-食指)
  isFist: boolean                 // 是否握拳
  gesture: string                 // 手势名称
}

type AppState = {
  leftHand: HandData | null
  rightHand: HandData | null
  setHandData: (hand: 'left' | 'right', data: HandData | null) => void
}

export const useStore = create<AppState>((set) => ({
  leftHand: null,
  rightHand: null,
  
  // 🔥 修复点：
  // 原来写的是：set((state) => ({ ... }))
  // 这里的 'state' 没用到，所以报错 TS6133
  // 👇 改成空括号 '()' 即可
  setHandData: (hand, data) => set(() => ({ 
    [hand === 'left' ? 'leftHand' : 'rightHand']: data 
  })),
}))