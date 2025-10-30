import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 导入服务
import { database } from './database/database'
import { initializeSocketManager } from './socket/socketManager'

// 导入路由
import authRoutes from './routes/auth'
import chatRoutes from './routes/chat'
import personalityRoutes from './routes/personality'
import memoryRoutes from './routes/memory'
import emotionRoutes from './routes/emotion'
import ttsRoutes from './routes/tts'
import aiRoutes from './routes/ai'

const app = express()
const server = createServer(app)

// Socket.IO配置
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'http://localhost:5173'
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
})

// 中间件配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://localhost:5173'
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, '../public')))

// TTS音频文件服务
const ttsAudioPath = path.join(process.cwd(), 'cache', 'tts')
if (!fs.existsSync(ttsAudioPath)) {
  fs.mkdirSync(ttsAudioPath, { recursive: true })
}
app.use('/api/tts/audio', express.static(ttsAudioPath))

// 请求日志中间件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path}`)
  next()
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  })
})

// 路由挂载
app.use('/api/auth', authRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/personality', personalityRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/emotion', emotionRoutes)
app.use('/api/tts', ttsRoutes)
app.use('/api/ai', aiRoutes)

// Socket.IO连接处理
const socketManager = initializeSocketManager(io)

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err)
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  })
})

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  })
})

// 服务器启动
const PORT = process.env.PORT || 3001

async function startServer() {
  try {
    // 数据库已在导入时初始化
    console.log('Database ready')
    console.log('Database stats:', database.getStats())

    // 启动服务器
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`)
      console.log(`🌐 Socket.IO enabled on port ${PORT}`)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 Frontend URL: http://localhost:5173`)
      }
    })

    // 优雅关闭处理
    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// 优雅关闭
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`)
  
  try {
    // 关闭Socket.IO连接
    console.log('Closing Socket.IO connections...')
    io.close()
    
    // 关闭数据库连接
    console.log('Closing database connection...')
    database.close()
    
    // 关闭HTTP服务器
    console.log('Closing HTTP server...')
    server.close(() => {
      console.log('✅ Server closed successfully')
      process.exit(0)
    })
    
    // 强制退出超时
    setTimeout(() => {
      console.error('❌ Forced shutdown due to timeout')
      process.exit(1)
    }, 10000)
    
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})

// 启动服务器
startServer()

export { app, server, io }