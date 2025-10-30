/**
 * 数据模型类型定义
 */

export interface User {
  id: number
  username: string
  password: string
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: number
  user_id: number
  title: string
  current_personality: PersonalityType
  lastMessage?: string
  lastMessageTime?: number
  lastPersonality?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  personality?: PersonalityType
  emotion?: string
  voiceParams?: {
    voice: string
    emotion: string
    speed: number
    pitch: number
  }
  timestamp?: number
  created_at: string
}

export interface MemoryFragment {
  id: number
  user_id: number
  title: string
  content: string
  unlock_condition: string
  unlockCondition: string
  is_unlocked: boolean
  isUnlocked: boolean
  unlocked_at?: string
  fragment_order: number
  created_at: string
}

export interface UserEmotion {
  id: number
  user_id: number
  emotion_type: string
  intensity: number
  detected_at: string
}

// RZ-07人格类型
export type PersonalityType = 'default' | 'tsundere' | 'tech_cold' | 'warm_healing' | 'defensive'

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 聊天请求类型
export interface ChatRequest {
  message: string
  session_id?: number
  personality?: PersonalityType
}

// 聊天响应类型
export interface ChatResponse {
  message: string
  personality: PersonalityType
  emotion?: string
  session_id: number
  memory_unlocked?: MemoryFragment
  tts_url?: string
}

// JWT载荷类型
export interface JwtPayload {
  userId: number
  username: string
  iat?: number
  exp?: number
}