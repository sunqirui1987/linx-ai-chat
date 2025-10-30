/**
 * JWT认证中间件
 */
import jwt from 'jsonwebtoken'
// @ts-ignore - jsonwebtoken doesn't have proper ES module exports
import type { Request, Response, NextFunction } from 'express'
import type { JwtPayload } from '../types/models.js'

// 扩展Request类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

/**
 * 验证JWT token中间件
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: '访问令牌缺失'
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: '访问令牌无效'
    })
  }
}

/**
 * 生成JWT token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * 验证JWT token（不作为中间件使用）
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch (error) {
    return null
  }
}