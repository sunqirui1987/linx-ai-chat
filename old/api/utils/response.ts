import type { Response } from 'express'

/**
 * 统一的API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    timestamp: string
    requestId?: string
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  // 通用错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  
  // 业务错误
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  MESSAGE_EMPTY = 'MESSAGE_EMPTY',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  TTS_SERVICE_ERROR = 'TTS_SERVICE_ERROR',
  EMOTION_ANALYSIS_ERROR = 'EMOTION_ANALYSIS_ERROR',
  PERSONALITY_SWITCH_ERROR = 'PERSONALITY_SWITCH_ERROR',
  
  // 验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_FORMAT = 'INVALID_FIELD_FORMAT'
}

/**
 * 自定义错误类
 */
export class ApiError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: any

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * 响应工具类
 */
export class ResponseUtil {
  /**
   * 成功响应
   */
  static success<T>(
    res: Response,
    data?: T,
    statusCode: number = 200,
    meta?: ApiResponse['meta']
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }
    
    res.status(statusCode).json(response)
  }

  /**
   * 错误响应
   */
  static error(
    res: Response,
    error: ApiError | Error,
    requestId?: string
  ): void {
    let statusCode = 500
    let code = ErrorCode.INTERNAL_SERVER_ERROR
    let details: any

    if (error instanceof ApiError) {
      statusCode = error.statusCode
      code = error.code
      details = error.details
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message: error.message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId
      }
    }

    res.status(statusCode).json(response)
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number
      limit: number
      total: number
    },
    statusCode: number = 200
  ): void {
    const totalPages = Math.ceil(pagination.total / pagination.limit)
    
    this.success(res, data, statusCode, {
      timestamp: new Date().toISOString(),
      pagination: {
        ...pagination,
        totalPages
      }
    })
  }
}

/**
 * 常用错误创建函数
 */
export const createError = {
  badRequest: (message: string, details?: any) => 
    new ApiError(ErrorCode.INVALID_REQUEST, message, 400, details),
    
  unauthorized: (message: string = 'Unauthorized') => 
    new ApiError(ErrorCode.UNAUTHORIZED, message, 401),
    
  forbidden: (message: string = 'Forbidden') => 
    new ApiError(ErrorCode.FORBIDDEN, message, 403),
    
  notFound: (message: string = 'Resource not found') => 
    new ApiError(ErrorCode.NOT_FOUND, message, 404),
    
  validation: (message: string, details?: any) => 
    new ApiError(ErrorCode.VALIDATION_ERROR, message, 422, details),
    
  internal: (message: string = 'Internal server error', details?: any) => 
    new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, message, 500, details),
    
  sessionNotFound: (sessionId: string) => 
    new ApiError(ErrorCode.SESSION_NOT_FOUND, `Session ${sessionId} not found`, 404),
    
  messageEmpty: () => 
    new ApiError(ErrorCode.MESSAGE_EMPTY, 'Message content cannot be empty', 400),
    
  aiServiceError: (message: string, details?: any) => 
    new ApiError(ErrorCode.AI_SERVICE_ERROR, message, 500, details),
    
  ttsServiceError: (message: string, details?: any) => 
    new ApiError(ErrorCode.TTS_SERVICE_ERROR, message, 500, details)
}