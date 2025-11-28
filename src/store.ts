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
  
  // 🔥 修复点在这里：
  // 原来是：set((state) => ({ ... }))
  // 现在改成：set(() => ({ ... })) 
  // 解析：删掉了那个没用到的 'state' 参数，改成了空括号 '()'
  setHandData: (hand, data) => set(() => ({ 
    [hand === 'left' ? 'leftHand' : 'rightHand']: data 
  })),
}))