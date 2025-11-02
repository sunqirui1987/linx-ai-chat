/**
 * 用户认证API路由
 * 处理用户注册、登录、令牌管理等
 * 使用新的架构模式：统一响应格式、错误处理、输入验证
 */
import * as express from 'express'
import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import { authenticateToken, generateToken } from '../middleware/auth.js'
import { SimpleDatabase } from '../config/simple-db.js'
import { ResponseUtil, createError } from '../utils/response'
import { validateBody } from '../utils/validation'
import { asyncHandler } from '../middleware'
import type { User, ApiResponse } from '../types/models.js'

const router = express.Router()

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register',
  validateBody([
    { field: 'username', required: true, type: 'string', minLength: 3, maxLength: 20 },
    { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 50 }
  ]),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body

    // 检查用户是否已存在
    const existingUser = SimpleDatabase.findUserByUsername(username)
    if (existingUser) {
      throw createError.badRequest('用户名已存在')
    }

    // 哈希密码 (使用crypto替代bcrypt)
    const hashedPassword = crypto.createHash('sha256').update(password + 'salt').digest('hex')

    // 创建新用户
    const user = SimpleDatabase.createUser(username, hashedPassword)

    // 生成JWT令牌
    const token = generateToken({ userId: user.id, username: user.username })

    ResponseUtil.success(res, {
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at
      },
      token
    }, 201)
  })
)

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login',
  validateBody([
    { field: 'username', required: true, type: 'string' },
    { field: 'password', required: true, type: 'string' }
  ]),
  asyncHandler(async (req, res) => {
    // 调试日志：查看请求体
    console.log('🔍 Login request body:', req.body)
    console.log('🔍 Request headers:', req.headers)
    console.log('🔍 Content-Type:', req.headers['content-type'])
    
    const { username, password } = req.body

    // 查找用户
    const user = SimpleDatabase.findUserByUsername(username)
    if (!user) {
      throw createError.unauthorized('用户名或密码错误')
    }

    // 验证密码
    const hashedPassword = crypto.createHash('sha256').update(password + 'salt').digest('hex')
    if (user.password !== hashedPassword) {
      throw createError.unauthorized('用户名或密码错误')
    }

    // 生成JWT令牌
    const token = generateToken({ userId: user.id, username: user.username })

    ResponseUtil.success(res, {
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at
      },
      token
    })
  })
)

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', 
  authenticateToken,
  asyncHandler(async (req: any, res) => {
    const user = req.user

    ResponseUtil.success(res, {
      id: user.id,
      username: user.username,
      created_at: user.created_at
    })
  })
)

/**
 * 验证令牌
 * GET /api/auth/verify
 */
router.get('/verify',
  authenticateToken,
  asyncHandler(async (req: any, res) => {
    ResponseUtil.success(res, {
      valid: true,
      user: req.user
    })
  })
)

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    // 在实际应用中，这里可以将token加入黑名单
    // 目前只是返回成功响应
    ResponseUtil.success(res, { message: '登出成功' })
  })
)

export default router
