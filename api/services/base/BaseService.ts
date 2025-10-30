/**
 * 基础服务类
 * 提供通用的服务功能和依赖注入支持
 */
import { dbManager } from '../../config/database'
import { ApiError } from '../../utils/response'
import * as Database from 'better-sqlite3'

/**
 * 基础服务抽象类
 */
export abstract class BaseService {
  protected db: Database.Database

  constructor() {
    this.db = dbManager.getConnection()
  }

  /**
   * 执行事务
   */
  protected transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)()
  }

  /**
   * 验证必需参数
   */
  protected validateRequired(params: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => 
      params[field] === undefined || params[field] === null || params[field] === ''
    )
    
    if (missing.length > 0) {
      throw new ApiError(
        'VALIDATION_ERROR' as any,
        `Missing required fields: ${missing.join(', ')}`,
        400
      )
    }
  }

  /**
   * 生成唯一ID
   */
  protected generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 格式化时间戳
   */
  protected formatTimestamp(date?: Date): string {
    return (date || new Date()).toISOString()
  }

  /**
   * 安全地解析JSON
   */
  protected safeJsonParse<T>(jsonString: string | null, defaultValue: T): T {
    if (!jsonString) return defaultValue
    
    try {
      return JSON.parse(jsonString)
    } catch {
      return defaultValue
    }
  }

  /**
   * 安全地序列化JSON
   */
  protected safeJsonStringify(obj: any): string {
    try {
      return JSON.stringify(obj)
    } catch {
      return '{}'
    }
  }

  /**
   * 分页查询辅助方法
   */
  protected buildPaginationQuery(baseQuery: string, page: number = 1, limit: number = 10): {
    query: string
    offset: number
    limit: number
  } {
    const offset = (page - 1) * limit
    const query = `${baseQuery} LIMIT ? OFFSET ?`
    
    return { query, offset, limit }
  }

  /**
   * 构建分页响应
   */
  protected buildPaginationResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
  ): {
    items: T[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  } {
    const totalPages = Math.ceil(total / limit)
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  /**
   * 记录操作日志
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${this.constructor.name}: ${message}`
    
    if (data) {
      console[level](logMessage, data)
    } else {
      console[level](logMessage)
    }
  }
}

/**
 * 服务容器接口
 */
export interface ServiceContainer {
  get<T>(serviceClass: new () => T): T
  register<T>(serviceClass: new () => T, instance?: T): void
}

/**
 * 简单的依赖注入容器
 */
export class DIContainer implements ServiceContainer {
  private static instance: DIContainer
  private services = new Map<string, any>()

  private constructor() {}

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer()
    }
    return DIContainer.instance
  }

  public get<T>(serviceClass: new () => T): T {
    const serviceName = serviceClass.name
    
    if (!this.services.has(serviceName)) {
      const instance = new serviceClass()
      this.services.set(serviceName, instance)
    }
    
    return this.services.get(serviceName)
  }

  public register<T>(serviceClass: new () => T, instance?: T): void {
    const serviceName = serviceClass.name
    this.services.set(serviceName, instance || new serviceClass())
  }

  public clear(): void {
    this.services.clear()
  }
}

// 导出容器实例
export const container = DIContainer.getInstance()