import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { ApiError, ResponseUtil } from '../utils/response'

/**
 * 扩展 Request 接口以包含 requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId: string
    }
  }
}

/**
 * 请求ID中间件
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  req.requestId = randomUUID()
  res.setHeader('X-Request-ID', req.requestId)
  next()
}

/**
 * 请求日志中间件
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const timestamp = new Date().toISOString()
  
  console.log(`[${timestamp}] ${req.method} ${req.path} - Request ID: ${req.requestId}`)
  
  // 记录请求体（排除敏感信息）
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body }
    // 移除敏感字段
    delete sanitizedBody.password
    delete sanitizedBody.token
    console.log(`[${timestamp}] Request Body:`, JSON.stringify(sanitizedBody, null, 2))
  }
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start
    const endTimestamp = new Date().toISOString()
    console.log(`[${endTimestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - Request ID: ${req.requestId}`)
  })
  
  next()
}

/**
 * 错误处理中间件
 */
export function errorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[Error] Request ID: ${req.requestId}`, error)
  
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(error)
  }
  
  ResponseUtil.error(res, error, req.requestId)
}

/**
 * 404处理中间件
 */
export function notFoundHandler(req: Request, res: Response) {
  ResponseUtil.error(
    res,
    new ApiError('NOT_FOUND' as any, `Route ${req.method} ${req.path} not found`, 404),
    req.requestId
  )
}

/**
 * 安全头中间件
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // 设置安全相关的HTTP头
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // 在生产环境中启用HSTS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  next()
}

/**
 * 速率限制中间件（简单实现）
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    const windowStart = now - options.windowMs
    
    // 清理过期记录
    Array.from(rateLimitStore.entries()).forEach(([ip, data]) => {
      if (data.resetTime < now) {
        rateLimitStore.delete(ip)
      }
    })
    
    const current = rateLimitStore.get(key)
    
    if (!current || current.resetTime < now) {
      // 新的时间窗口
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      })
      return next()
    }
    
    if (current.count >= options.max) {
      return ResponseUtil.error(
        res,
        new ApiError('RATE_LIMIT_EXCEEDED' as any, 'Too many requests', 429),
        req.requestId
      )
    }
    
    current.count++
    next()
  }
}

/**
 * 健康检查中间件
 */
export function healthCheck(req: Request, res: Response) {
  ResponseUtil.success(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  })
}

/**
 * 异步路由处理器包装器
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}