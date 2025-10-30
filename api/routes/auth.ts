/**
 * 用户认证API路由
 * 处理用户注册、登录、令牌管理等
 */
import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { authenticateToken, generateToken } from '../middleware/auth.js'
import { SimpleDatabase } from '../config/simple-db.js'
import type { User, ApiResponse } from '../types/models.js'

const router = Router()

/**
 * 用户注册
 * POST /api/auth/register
 */// 用户注册
router.post('/register', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      } as ApiResponse)
      return
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: '密码长度至少6位'
      } as ApiResponse)
      return
    }

    // 检查用户是否已存在
    const existingUser = SimpleDatabase.findUserByUsername(username)
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: '用户名已存在'
      } as ApiResponse)
      return
    }

    // 哈希密码 (使用crypto替代bcrypt)
    const hashedPassword = crypto.createHash('sha256').update(password + 'salt').digest('hex')

    // 创建用户
    const user = SimpleDatabase.createUser(username, hashedPassword)
    const userId = user.id

    // 生成JWT token
    const token = generateToken({ userId, username })

    res.status(201).json({
      success: true,
      data: {
        user: { id: userId, username },
        token
      },
      message: '注册成功'
    } as ApiResponse)
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    } as ApiResponse)
  }
})

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      } as ApiResponse)
      return
    }

    // 查找用户
    const user = SimpleDatabase.findUserByUsername(username)

    if (!user) {
      res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      } as ApiResponse)
      return
    }

    // 验证密码
    const hashedInputPassword = crypto.createHash('sha256').update(password + 'salt').digest('hex')
    const isValidPassword = hashedInputPassword === user.password
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      } as ApiResponse)
      return
    }

    // 生成JWT token
    const token = generateToken({ userId: user.id, username: user.username })

    res.json({
      success: true,
      data: {
        user: { id: user.id, username: user.username },
        token
      },
      message: '登录成功'
    } as ApiResponse)
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    } as ApiResponse)
  }
})

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      user: req.user
    },
    message: '获取用户信息成功'
  } as ApiResponse)
})

/**
 * 验证token
 * GET /api/auth/verify
 */
router.get('/verify', authenticateToken, (req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      user: req.user
    },
    message: 'Token有效'
  } as ApiResponse)
})

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, (req: Request, res: Response): void => {
  // 由于使用JWT，登出主要在客户端处理（删除token）
  res.json({
    success: true,
    message: '登出成功'
  } as ApiResponse)
})

export default router
