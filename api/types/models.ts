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
export type PersonalityType = 'default' | 'tsundere' | 'tech_cold' | 'warm_healing' | 'defensive' | 'demon' | 'angel'

// 好感度系统相关类型
export interface AffinityData {
  id: number
  user_id: number
  demon_affinity: number      // 恶魔好感度 0-100
  angel_affinity: number      // 天使好感度 0-100
  corruption_value: number    // 堕落值 0-100
  purity_value: number        // 纯洁值 0-100
  total_choices: number       // 总选择次数
  demon_choices: number       // 选择恶魔建议次数
  angel_choices: number       // 选择天使建议次数
  last_choice_type?: 'demon' | 'angel' | 'neutral'
  updated_at: string
  created_at: string
}

export interface AffinityChoice {
  id: number
  user_id: number
  session_id: number
  choice_type: 'demon' | 'angel' | 'neutral'
  choice_content: string
  affinity_change: {
    demon_affinity: number
    angel_affinity: number
    corruption_value: number
    purity_value: number
  }
  created_at: string
}

// 记忆片段系统相关类型
export interface MemoryFragmentData {
  id: number
  fragment_id: string         // 唯一标识符，如 'A1', 'B2' 等
  category: 'A' | 'B' | 'C' | 'D' | 'E'  // 善恶起源、诱惑与抗争、救赎与成长、智慧与理解、超越与升华
  title: string
  content: string
  description: string         // 详细描述
  unlock_conditions: {
    conversation_count?: number    // 对话轮数要求
    demon_affinity?: number       // 恶魔好感度要求
    angel_affinity?: number       // 天使好感度要求
    corruption_value?: number     // 堕落值要求
    purity_value?: number         // 纯洁值要求
    choice_count?: number         // 选择次数要求
    demon_choices?: number        // 恶魔选择次数要求
    angel_choices?: number        // 天使选择次数要求
    specific_choices?: string[]   // 特定选择要求
    time_played?: number          // 游戏时长要求（分钟）
  }
  rarity: 'common' | 'rare' | 'epic' | 'legendary'  // 稀有度
  order: number               // 在分类中的顺序
  created_at: string
}

export interface UserMemoryProgress {
  id: number
  user_id: number
  fragment_id: string
  is_unlocked: boolean
  unlocked_at?: string
  unlock_trigger: string      // 解锁触发条件描述
  viewed_at?: string          // 首次查看时间
  view_count: number          // 查看次数
  created_at: string
}

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

// 好感度相关API响应类型
export interface AffinityResponse {
  demon_affinity: number
  angel_affinity: number
  corruption_value: number
  purity_value: number
  total_choices: number
  demon_choices: number
  angel_choices: number
  last_choice_type?: 'demon' | 'angel' | 'neutral'
  balance_status: 'demon_dominant' | 'angel_dominant' | 'balanced'
  next_personality_suggestion: PersonalityType
}

export interface AffinityChoiceRequest {
  choice_type: 'demon' | 'angel' | 'neutral'
  choice_content: string
  session_id: number
}

// 记忆片段相关API响应类型
export interface MemoryFragmentResponse {
  fragment_id: string
  category: 'A' | 'B' | 'C' | 'D' | 'E'
  title: string
  content: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  is_unlocked: boolean
  unlocked_at?: string
  unlock_trigger?: string
  viewed_at?: string
  view_count: number
}

export interface MemoryProgressResponse {
  total_fragments: number
  unlocked_count: number
  unlock_progress: number  // 百分比
  categories: {
    [key in 'A' | 'B' | 'C' | 'D' | 'E']: {
      name: string
      total: number
      unlocked: number
      fragments: MemoryFragmentResponse[]
    }
  }
  recent_unlocks: MemoryFragmentResponse[]
  next_unlock_hints: string[]
}