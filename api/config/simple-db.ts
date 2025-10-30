/**
 * 简单的JSON文件数据库替代方案
 * 用于开发阶段，避免SQLite编译问题
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { User, ChatSession, ChatMessage, MemoryFragment, UserEmotion } from '../types/models.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '../../data')
const dbFile = path.join(dataDir, 'simple-db.json')

interface SimpleDB {
  users: User[]
  chat_sessions: ChatSession[]
  chat_messages: ChatMessage[]
  memory_fragments: MemoryFragment[]
  user_emotions: UserEmotion[]
  counters: {
    users: number
    chat_sessions: number
    chat_messages: number
    memory_fragments: number
    user_emotions: number
  }
}

// 初始化数据库结构
const initDB: SimpleDB = {
  users: [],
  chat_sessions: [],
  chat_messages: [],
  memory_fragments: [],
  user_emotions: [],
  counters: {
    users: 0,
    chat_sessions: 0,
    chat_messages: 0,
    memory_fragments: 0,
    user_emotions: 0
  }
}

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 确保数据库文件存在
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify(initDB, null, 2))
}

// 读取数据库
function readDB(): SimpleDB {
  try {
    const data = fs.readFileSync(dbFile, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('读取数据库失败:', error)
    return initDB
  }
}

// 写入数据库
function writeDB(data: SimpleDB): void {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('写入数据库失败:', error)
  }
}

// 获取下一个ID
function getNextId(table: keyof SimpleDB['counters']): number {
  const db = readDB()
  db.counters[table]++
  writeDB(db)
  return db.counters[table]
}

// 简单的数据库操作类
export class SimpleDatabase {
  // 用户操作
  static createUser(username: string, password: string): User {
    const db = readDB()
    const id = getNextId('users')
    const now = new Date().toISOString()
    
    const user: User = {
      id,
      username,
      password,
      created_at: now,
      updated_at: now
    }
    
    db.users.push(user)
    writeDB(db)
    return user
  }

  static findUserByUsername(username: string): User | undefined {
    const db = readDB()
    return db.users.find(user => user.username === username)
  }

  static findUserById(id: number): User | undefined {
    const db = readDB()
    return db.users.find(user => user.id === id)
  }

  // 聊天会话操作
  static createChatSession(userId: number, title: string = '新对话', personality: string = 'default'): ChatSession {
    const db = readDB()
    const id = getNextId('chat_sessions')
    const now = new Date().toISOString()
    
    const session: ChatSession = {
      id,
      user_id: userId,
      title,
      current_personality: personality as any,
      created_at: now,
      updated_at: now
    }
    
    db.chat_sessions.push(session)
    writeDB(db)
    return session
  }

  static findChatSessionsByUserId(userId: number): ChatSession[] {
    const db = readDB()
    return db.chat_sessions
      .filter(session => session.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }

  static findChatSessionById(id: number): ChatSession | undefined {
    const db = readDB()
    return db.chat_sessions.find(session => session.id === id)
  }

  static updateChatSession(id: number, updates: Partial<ChatSession>): void {
    const db = readDB()
    const index = db.chat_sessions.findIndex(session => session.id === id)
    if (index !== -1) {
      db.chat_sessions[index] = { ...db.chat_sessions[index], ...updates, updated_at: new Date().toISOString() }
      writeDB(db)
    }
  }

  static deleteChatSession(id: number): void {
    const db = readDB()
    db.chat_sessions = db.chat_sessions.filter(session => session.id !== id)
    db.chat_messages = db.chat_messages.filter(message => message.session_id !== id)
    writeDB(db)
  }

  // 聊天消息操作
  static createChatMessage(sessionId: number, role: 'user' | 'assistant', content: string, personality?: string, emotion?: string, voiceParams?: any): ChatMessage {
    const db = readDB()
    const id = getNextId('chat_messages')
    const now = new Date().toISOString()
    
    const message: ChatMessage = {
      id,
      session_id: sessionId,
      role,
      content,
      personality: personality as any,
      emotion,
      voiceParams,
      timestamp: Date.now(),
      created_at: now
    }
    
    db.chat_messages.push(message)
    writeDB(db)
    return message
  }

  static findChatMessagesBySessionId(sessionId: number): ChatMessage[] {
    const db = readDB()
    return db.chat_messages
      .filter(message => message.session_id === sessionId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  // 记忆片段操作
  static createMemoryFragment(userId: number, title: string, content: string, unlockCondition: string, order: number): MemoryFragment {
    const db = readDB()
    const id = getNextId('memory_fragments')
    const now = new Date().toISOString()
    
    const fragment: MemoryFragment = {
      id,
      user_id: userId,
      title,
      content,
      unlock_condition: unlockCondition,
      unlockCondition: unlockCondition,
      is_unlocked: false,
      isUnlocked: false,
      fragment_order: order,
      created_at: now
    }
    
    db.memory_fragments.push(fragment)
    writeDB(db)
    return fragment
  }

  static findMemoryFragmentsByUserId(userId: number): MemoryFragment[] {
    const db = readDB()
    return db.memory_fragments
      .filter(fragment => fragment.user_id === userId)
      .sort((a, b) => a.fragment_order - b.fragment_order)
  }

  static findUnlockedMemoryFragmentsByUserId(userId: number): MemoryFragment[] {
    const db = readDB()
    return db.memory_fragments
      .filter(fragment => fragment.user_id === userId && fragment.is_unlocked)
      .sort((a, b) => a.fragment_order - b.fragment_order)
  }

  static findMemoryFragmentById(id: number): MemoryFragment | undefined {
    const db = readDB()
    return db.memory_fragments.find(fragment => fragment.id === id)
  }

  static unlockMemoryFragment(id: number): MemoryFragment | undefined {
    const db = readDB()
    const index = db.memory_fragments.findIndex(fragment => fragment.id === id)
    if (index !== -1) {
      db.memory_fragments[index].is_unlocked = true
      db.memory_fragments[index].isUnlocked = true
      db.memory_fragments[index].unlocked_at = new Date().toISOString()
      writeDB(db)
      return db.memory_fragments[index]
    }
    return undefined
  }

  static countMemoryFragmentsByUserId(userId: number): number {
    const db = readDB()
    return db.memory_fragments.filter(fragment => fragment.user_id === userId).length
  }

  static initializeMemoryFragments(userId: number): void {
    const memoryFragments = [
      { title: '初次相遇', content: '那是我们第一次见面的时候...', unlock_condition: 'first_chat', order: 1 },
      { title: '街头回忆', content: '在那条熟悉的街道上...', unlock_condition: 'chat_count_10', order: 2 },
      { title: '科技梦想', content: '关于未来科技的憧憬...', unlock_condition: 'tech_topic', order: 3 },
      { title: '深夜对话', content: '那个深夜我们聊了很久...', unlock_condition: 'late_night_chat', order: 4 },
      { title: '温暖时光', content: '你需要安慰的那个时刻...', unlock_condition: 'comfort_given', order: 5 },
      { title: '倔强的心', content: '即使嘴硬，心里还是很在意...', unlock_condition: 'tsundere_moment', order: 6 },
      { title: '代码人生', content: '在代码的世界里找到自己...', unlock_condition: 'programming_talk', order: 7 },
      { title: '城市夜景', content: '霓虹灯下的思考...', unlock_condition: 'night_conversation', order: 8 },
      { title: '真心话', content: '那些平时不愿意说的话...', unlock_condition: 'emotional_sharing', order: 9 },
      { title: '未来规划', content: '对未来的期待和计划...', unlock_condition: 'future_talk', order: 10 },
      { title: '技术突破', content: '在技术上的重大发现...', unlock_condition: 'tech_breakthrough', order: 11 },
      { title: '友情见证', content: '友谊逐渐加深的时刻...', unlock_condition: 'friendship_deepened', order: 12 },
      { title: '挫折与成长', content: '面对困难时的坚持...', unlock_condition: 'overcome_difficulty', order: 13 },
      { title: '创意火花', content: '灵感迸发的瞬间...', unlock_condition: 'creative_moment', order: 14 },
      { title: '心灵共鸣', content: '彼此理解的深度交流...', unlock_condition: 'deep_understanding', order: 15 },
      { title: '守护承诺', content: '想要保护重要的人...', unlock_condition: 'protective_instinct', order: 16 },
      { title: '突破自我', content: '超越过去的自己...', unlock_condition: 'self_improvement', order: 17 },
      { title: '珍贵回忆', content: '那些值得珍藏的时光...', unlock_condition: 'precious_memory', order: 18 },
      { title: '永恒约定', content: '不会改变的承诺...', unlock_condition: 'eternal_promise', order: 19 },
      { title: '真实的我', content: '最真实的内心世界...', unlock_condition: 'true_self_revealed', order: 20 }
    ]

    for (const fragment of memoryFragments) {
      this.createMemoryFragment(userId, fragment.title, fragment.content, fragment.unlock_condition, fragment.order)
    }
  }
}

// 初始化数据库
export function initDatabase() {
  console.log('简单数据库初始化完成')
}