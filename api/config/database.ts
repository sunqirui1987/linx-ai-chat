/**
 * SQLite数据库配置和管理
 */
import * as Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'

/**
 * 数据库配置接口
 */
interface DatabaseConfig {
  path: string
  options: Database.Options
}

/**
 * 数据库连接管理器
 */
class DatabaseManager {
  private static instance: DatabaseManager
  private db: Database.Database | null = null
  private config: DatabaseConfig

  private constructor() {
    this.config = {
      path: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'chat.db'),
      options: {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
        fileMustExist: false
      }
    }
  }

  /**
   * 获取数据库管理器实例
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  /**
   * 初始化数据库连接
   */
  public async initialize(): Promise<Database.Database> {
    if (this.db) {
      return this.db
    }

    try {
      // 确保数据库目录存在
      const dbDir = path.dirname(this.config.path)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // 创建数据库连接
      this.db = new Database.default(this.config.path, this.config.options)
      
      // 设置数据库配置
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('synchronous = NORMAL')
      this.db.pragma('cache_size = 1000')
      this.db.pragma('temp_store = memory')
      this.db.pragma('foreign_keys = ON')

      console.log(`Database initialized at: ${this.config.path}`)
      return this.db
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  /**
   * 获取数据库连接
   */
  public getConnection(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  /**
   * 关闭数据库连接
   */
  public close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('Database connection closed')
    }
  }

  /**
   * 初始化数据库表
   */
  public async initializeTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not available')
    }

    const tables = [
      // 用户表
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // 聊天会话表
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT DEFAULT '新对话',
        current_personality TEXT DEFAULT 'default',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // 聊天消息表
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        personality TEXT,
        emotion TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )`,

      // 记忆片段表
      `CREATE TABLE IF NOT EXISTS memory_fragments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        unlock_condition TEXT NOT NULL,
        is_unlocked BOOLEAN DEFAULT FALSE,
        unlocked_at DATETIME,
        fragment_order INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // 用户情绪状态表
      `CREATE TABLE IF NOT EXISTS user_emotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        emotion_type TEXT NOT NULL,
        intensity REAL NOT NULL,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ]

    try {
      // 在事务中执行所有表创建
      this.db.transaction(() => {
        tables.forEach(sql => this.db!.exec(sql))
      })()

      console.log('数据库表初始化完成')
    } catch (error) {
      console.error('Failed to initialize database tables:', error)
      throw error
    }
  }
}

// 导出单例实例
export const dbManager = DatabaseManager.getInstance()

// 兼容性函数
export async function initDatabase() {
  await dbManager.initialize()
  await dbManager.initializeTables()
}

export function closeDatabase() {
  dbManager.close()
}

// 获取数据库连接的便捷函数
export function getDb() {
  return dbManager.getConnection()
}