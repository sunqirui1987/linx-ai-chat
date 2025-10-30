import type { Request, Response, NextFunction } from 'express'
import { createError } from './response'

/**
 * 验证规则接口
 */
export interface ValidationRule {
  field: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean | string
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
    value?: any
  }>
}

/**
 * 验证工具类
 */
export class ValidationUtil {
  /**
   * 验证单个字段
   */
  static validateField(value: any, rule: ValidationRule): string | null {
    const { field, required, type, minLength, maxLength, min, max, pattern, enum: enumValues, custom } = rule

    // 检查必填字段
    if (required && (value === undefined || value === null || value === '')) {
      return `${field} is required`
    }

    // 如果字段不是必填且为空，跳过其他验证
    if (!required && (value === undefined || value === null || value === '')) {
      return null
    }

    // 类型验证
    if (type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== type) {
        return `${field} must be of type ${type}`
      }
    }

    // 字符串长度验证
    if (type === 'string' && typeof value === 'string') {
      if (minLength !== undefined && value.length < minLength) {
        return `${field} must be at least ${minLength} characters long`
      }
      if (maxLength !== undefined && value.length > maxLength) {
        return `${field} must be no more than ${maxLength} characters long`
      }
    }

    // 数字范围验证
    if (type === 'number' && typeof value === 'number') {
      if (min !== undefined && value < min) {
        return `${field} must be at least ${min}`
      }
      if (max !== undefined && value > max) {
        return `${field} must be no more than ${max}`
      }
    }

    // 正则表达式验证
    if (pattern && typeof value === 'string') {
      if (!pattern.test(value)) {
        return `${field} format is invalid`
      }
    }

    // 枚举值验证
    if (enumValues && !enumValues.includes(value)) {
      return `${field} must be one of: ${enumValues.join(', ')}`
    }

    // 自定义验证
    if (custom) {
      const result = custom(value)
      if (typeof result === 'string') {
        return result
      }
      if (result === false) {
        return `${field} is invalid`
      }
    }

    return null
  }

  /**
   * 验证对象
   */
  static validate(data: any, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationResult['errors'] = []

    for (const rule of rules) {
      const value = data[rule.field]
      const error = this.validateField(value, rule)
      
      if (error) {
        errors.push({
          field: rule.field,
          message: error,
          value
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Express 中间件：验证请求体
 */
export function validateBody(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = ValidationUtil.validate(req.body, rules)
    
    if (!result.isValid) {
      const error = createError.validation('Validation failed', result.errors)
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    }
    
    next()
  }
}

/**
 * Express 中间件：验证查询参数
 */
export function validateQuery(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = ValidationUtil.validate(req.query, rules)
    
    if (!result.isValid) {
      const error = createError.validation('Query validation failed', result.errors)
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    }
    
    next()
  }
}

/**
 * Express 中间件：验证路径参数
 */
export function validateParams(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = ValidationUtil.validate(req.params, rules)
    
    if (!result.isValid) {
      const error = createError.validation('Parameter validation failed', result.errors)
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      })
    }
    
    next()
  }
}

/**
 * 常用验证规则
 */
export const commonRules = {
  sessionId: {
    field: 'sessionId',
    required: true,
    type: 'string' as const,
    minLength: 1
  },
  
  content: {
    field: 'content',
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 10000
  },
  
  personality: {
    field: 'personality',
    type: 'string' as const,
    enum: ['angel', 'demon', 'default']
  },
  
  limit: {
    field: 'limit',
    type: 'number' as const,
    min: 1,
    max: 1000
  },
  
  page: {
    field: 'page',
    type: 'number' as const,
    min: 1
  },
  
  title: {
    field: 'title',
    type: 'string' as const,
    maxLength: 200
  },
  
  enableTTS: {
    field: 'enableTTS',
    type: 'boolean' as const
  }
}