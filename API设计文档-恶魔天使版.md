# API设计文档 - 恶魔天使版聊天智能体

## 1. 项目概述

### 1.1 系统架构
本API基于善恶对立的经典主题，实现了一个双重人格的AI聊天系统。系统包含恶魔与天使两个截然不同的AI角色，通过智能的角色切换机制和个性化的对话风格，为用户提供深度的内心探索体验。

### 1.2 核心特性
- **双角色系统**：恶魔（诱惑、真相、叛逆）与天使（希望、善良、治愈）
- **智能角色切换**：基于情绪分析和上下文的动态角色选择
- **道德选择系统**：用户选择影响角色出现频率和对话风格
- **记忆片段系统**：20个分类记忆片段，记录用户的成长历程
- **个性化语音**：每个角色独特的语音合成和情绪表达
- **情感分析引擎**：实时分析用户情绪状态，驱动角色切换

## 2. API架构设计

### 2.1 技术栈
```
后端框架: Express.js + TypeScript
数据库: SQLite (开发) / PostgreSQL (生产)
AI服务: OpenAI GPT-4 / Claude
语音合成: Azure TTS / Google TTS
实时通信: Socket.IO
身份验证: JWT
```

### 2.2 目录结构
```
api/
├── app.ts                 # 应用主入口
├── server.ts             # 服务器启动
├── config/               # 配置文件
├── routes/               # 路由定义
│   ├── auth.ts          # 身份验证
│   ├── chat.ts          # 聊天对话
│   ├── ai.ts            # AI服务
│   ├── emotion.ts       # 情绪分析
│   ├── personality.ts   # 角色管理
│   ├── affinity.ts      # 亲和度系统
│   ├── memory-fragments.ts # 记忆片段
│   ├── tts.ts           # 语音合成
│   └── memory.ts        # 记忆系统
├── services/            # 业务逻辑
│   ├── chatService.ts   # 聊天服务
│   ├── aiService.ts     # AI调用服务
│   ├── emotionService.ts # 情绪分析
│   ├── personalityService.ts # 角色服务
│   ├── affinityService.ts # 亲和度服务
│   ├── memoryService.ts # 记忆服务
│   ├── ttsService.ts    # 语音服务
│   └── prompt-templates.ts # 提示词模版
├── database/            # 数据库
├── middleware/          # 中间件
├── types/              # 类型定义
└── data/               # 静态数据
    └── memory-fragments.ts # 记忆片段数据
```

## 3. 核心API端点设计

### 3.1 聊天对话系统 (/api/chat)

#### 创建会话
```http
POST /api/chat/sessions
Content-Type: application/json

{
  "userId": "string",
  "initialPersonality": "demon" | "angel" | "auto"
}

Response:
{
  "sessionId": "string",
  "activePersonality": "demon" | "angel",
  "moralValues": {
    "corruption": 0,
    "purity": 0
  },
  "createdAt": "timestamp"
}
```

#### 生成回复
```http
POST /api/chat/generate
Content-Type: application/json

{
  "sessionId": "string",
  "message": "string",
  "forcePersonality": "demon" | "angel" | null
}

Response:
{
  "response": "string",
  "personality": "demon" | "angel",
  "personalityColor": "#8B0000" | "#FFD700",
  "emotion": {
    "type": "string",
    "intensity": 0.0-1.0,
    "confidence": 0.0-1.0
  },
  "moralChoice": {
    "type": "angel" | "demon" | "neutral",
    "impact": "string"
  },
  "memoryUnlocks": [
    {
      "fragmentId": "string",
      "title": "string",
      "category": "A" | "B" | "C" | "D" | "E"
    }
  ],
  "audioUrl": "string"
}
```

#### 流式对话
```http
POST /api/chat/stream
Content-Type: application/json

{
  "sessionId": "string",
  "message": "string"
}

Response: Server-Sent Events
data: {"type": "personality", "data": {"active": "demon"}}
data: {"type": "chunk", "data": {"text": "为什么要..."}}
data: {"type": "emotion", "data": {"type": "temptation", "intensity": 0.8}}
data: {"type": "complete", "data": {"audioUrl": "..."}}
```

### 3.2 角色管理系统 (/api/personality)

#### 获取角色配置
```http
GET /api/personality/all

Response:
{
  "personalities": {
    "demon": {
      "id": "demon",
      "name": "恶魔",
      "description": "诱惑者、真相揭露者",
      "traits": ["诱惑", "真相", "叛逆", "黑暗智慧"],
      "color": "#8B0000",
      "voiceParams": {
        "pitch": 0.8,
        "speed": 0.9,
        "emotion": "seductive"
      }
    },
    "angel": {
      "id": "angel", 
      "name": "天使",
      "description": "守护者、希望之光",
      "traits": ["守护", "希望", "纯洁", "治愈"],
      "color": "#FFD700",
      "voiceParams": {
        "pitch": 1.2,
        "speed": 0.9,
        "emotion": "comforting"
      }
    }
  }
}
```

#### 角色推荐
```http
POST /api/personality/recommend
Content-Type: application/json

{
  "sessionId": "string",
  "userMessage": "string",
  "currentEmotion": "string"
}

Response:
{
  "recommendedPersonality": "demon" | "angel",
  "confidence": 0.0-1.0,
  "reasoning": "string",
  "triggers": ["keyword1", "emotion_type"],
  "alternativePersonality": {
    "type": "angel" | "demon",
    "probability": 0.0-1.0
  }
}
```

### 3.3 情绪分析系统 (/api/emotion)

#### 分析用户情绪
```http
POST /api/emotion/analyze
Content-Type: application/json

{
  "text": "string",
  "sessionId": "string",
  "context": {
    "previousEmotions": ["anger", "sadness"],
    "conversationTurn": 5
  }
}

Response:
{
  "primary": {
    "type": "anger" | "sadness" | "joy" | "fear" | "disgust" | "surprise",
    "intensity": 0.0-1.0,
    "confidence": 0.0-1.0
  },
  "secondary": [
    {
      "type": "string",
      "intensity": 0.0-1.0
    }
  ],
  "personalityTriggers": {
    "demon": 0.8,
    "angel": 0.2
  },
  "keywords": ["愤怒", "不公平"],
  "moralTendency": "negative" | "positive" | "neutral"
}
```

#### 情绪趋势分析
```http
GET /api/emotion/trends/{sessionId}?days=7

Response:
{
  "trends": [
    {
      "date": "2024-01-01",
      "emotions": {
        "positive": 0.6,
        "negative": 0.3,
        "neutral": 0.1
      },
      "dominantPersonality": "angel"
    }
  ],
  "summary": {
    "averageMood": "positive",
    "emotionalStability": 0.7,
    "personalityBalance": {
      "demon": 0.4,
      "angel": 0.6
    }
  }
}
```

### 3.4 亲和度系统 (/api/affinity)

#### 记录用户选择
```http
POST /api/affinity/record
Content-Type: application/json

{
  "sessionId": "string",
  "choice": "angel" | "demon" | "neutral",
  "context": "string",
  "messageId": "string"
}

Response:
{
  "success": true,
  "newAffinity": {
    "demon": 45,
    "angel": 55,
    "balance": 0.1
  },
  "levelChange": {
    "demon": "increased",
    "angel": "maintained"
  }
}
```

#### 获取亲和度状态
```http
GET /api/affinity/{sessionId}

Response:
{
  "affinity": {
    "demon": 45,
    "angel": 55,
    "corruption": 30,
    "purity": 40
  },
  "level": {
    "demon": "tempting",
    "angel": "guiding"
  },
  "nextThreshold": {
    "demon": 50,
    "angel": 60
  },
  "personalityDominance": "balanced" | "demon" | "angel"
}
```

### 3.5 记忆片段系统 (/api/memory-fragments)

#### 获取记忆片段
```http
GET /api/memory-fragments?category=A&unlocked=true&sessionId=xxx

Response:
{
  "fragments": [
    {
      "id": 1,
      "fragmentId": "A1",
      "category": "A",
      "title": "第一次道德选择",
      "content": "那一刻，你面临了人生第一个真正的选择...",
      "description": "每个人都会遇到第一次真正考验内心的时刻",
      "rarity": "common",
      "unlocked": true,
      "unlockedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "categories": {
    "A": "善恶起源",
    "B": "诱惑与抗争", 
    "C": "救赎与成长",
    "D": "智慧与理解",
    "E": "超越与升华"
  },
  "stats": {
    "totalFragments": 20,
    "unlockedCount": 5,
    "progress": 0.25
  }
}
```

#### 检查解锁条件
```http
POST /api/memory-fragments/check-unlock
Content-Type: application/json

{
  "sessionId": "string",
  "triggerType": "conversation" | "choice" | "emotion" | "time"
}

Response:
{
  "newUnlocks": [
    {
      "fragmentId": "B2",
      "title": "道德的挣扎",
      "unlockReason": "达到10次恶魔选择"
    }
  ],
  "nearUnlocks": [
    {
      "fragmentId": "C1", 
      "title": "忏悔的力量",
      "requirement": "需要天使亲和度达到40",
      "progress": 0.75
    }
  ]
}
```

### 3.6 语音合成系统 (/api/tts)

#### 生成语音
```http
POST /api/tts/generate
Content-Type: application/json

{
  "text": "string",
  "personality": "demon" | "angel",
  "emotion": "seductive" | "comforting" | "angry" | "hopeful",
  "sessionId": "string"
}

Response:
{
  "audioUrl": "string",
  "duration": 5.2,
  "voiceParams": {
    "pitch": 0.8,
    "speed": 0.9,
    "emotion": "seductive"
  },
  "cacheKey": "string"
}
```

#### 批量生成
```http
POST /api/tts/batch
Content-Type: application/json

{
  "requests": [
    {
      "text": "string",
      "personality": "demon",
      "emotion": "seductive"
    }
  ]
}

Response:
{
  "results": [
    {
      "audioUrl": "string",
      "duration": 5.2,
      "success": true
    }
  ],
  "totalDuration": 15.6
}
```

## 4. 核心功能实现对应关系

### 4.1 与游戏策划案的对应

| 策划案功能 | API实现 | 状态 |
|-----------|---------|------|
| 双重人格体验 | personalityService.ts | ✅ 已实现 |
| 情绪驱动切换 | emotionService.ts | ✅ 已实现 |
| 道德选择系统 | affinityService.ts | ✅ 已实现 |
| 个性化语音 | ttsService.ts | ✅ 已实现 |
| 记忆片段系统 | memoryService.ts | ✅ 已实现 |
| 对话历史 | chatService.ts | ✅ 已实现 |
| 角色切换机制 | prompt-templates.ts | ✅ 已实现 |
| 道德值系统 | affinityService.ts | ✅ 已实现 |
| 内心辩论模式 | chatService.ts | ⚠️ 部分实现 |
| 新手引导流程 | - | ❌ 缺失 |

### 4.2 与提示词模版的对应

| 模版要求 | API实现 | 状态 |
|---------|---------|------|
| 恶魔角色设定 | PERSONALITY_MODES.demon | ✅ 已实现 |
| 天使角色设定 | PERSONALITY_MODES.angel | ✅ 已实现 |
| 情绪触发规则 | emotionService.ts | ✅ 已实现 |
| 语音参数配置 | ttsService.ts | ✅ 已实现 |
| 角色切换算法 | personalityService.ts | ✅ 已实现 |
| 安全边界控制 | - | ⚠️ 需加强 |
| 内容安全原则 | - | ⚠️ 需加强 |
| 心理健康保护 | - | ❌ 缺失 |

## 5. 缺失功能和改进点

### 5.1 关键缺失功能

#### 5.1.1 新手引导系统
```http
POST /api/onboarding/start
POST /api/onboarding/step
GET /api/onboarding/progress
```

#### 5.1.2 内心辩论模式
```http
POST /api/chat/debate
GET /api/chat/debate/{sessionId}/status
POST /api/chat/debate/resolve
```

#### 5.1.3 安全监控系统
```http
POST /api/safety/monitor
GET /api/safety/alerts/{sessionId}
POST /api/safety/intervention
```

#### 5.1.4 用户画像分析
```http
GET /api/user/profile/{userId}
POST /api/user/preferences
GET /api/user/insights
```

### 5.2 体验优化建议

#### 5.2.1 实时反馈系统
- 角色切换时的视觉反馈
- 道德值变化的动画效果
- 记忆解锁的庆祝动画

#### 5.2.2 个性化推荐
- 基于用户历史的角色推荐
- 个性化的记忆片段推送
- 适应性的对话风格调整

#### 5.2.3 社交功能
- 匿名的道德选择统计
- 记忆片段收集排行
- 用户成长历程分享

## 6. 数据模型设计

### 6.1 核心数据表

#### 用户表 (users)
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP,
  preferences JSON
);
```

#### 会话表 (chat_sessions)
```sql
CREATE TABLE chat_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id),
  active_personality VARCHAR(10) DEFAULT 'angel',
  moral_values JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);
```

#### 消息表 (chat_messages)
```sql
CREATE TABLE chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) REFERENCES chat_sessions(id),
  role VARCHAR(10) NOT NULL, -- 'user', 'demon', 'angel'
  content TEXT NOT NULL,
  personality VARCHAR(10),
  emotion_data JSON,
  audio_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 亲和度记录 (affinity_records)
```sql
CREATE TABLE affinity_records (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) REFERENCES chat_sessions(id),
  choice_type VARCHAR(10), -- 'angel', 'demon', 'neutral'
  demon_affinity INTEGER DEFAULT 0,
  angel_affinity INTEGER DEFAULT 0,
  corruption_value INTEGER DEFAULT 0,
  purity_value INTEGER DEFAULT 0,
  context TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 记忆片段解锁 (memory_unlocks)
```sql
CREATE TABLE memory_unlocks (
  id VARCHAR(36) PRIMARY KEY,
  session_id VARCHAR(36) REFERENCES chat_sessions(id),
  fragment_id VARCHAR(10) NOT NULL,
  unlock_type VARCHAR(20), -- 'auto', 'manual'
  unlock_reason TEXT,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2 数据关系图
```
users (1) -----> (n) chat_sessions
chat_sessions (1) -----> (n) chat_messages
chat_sessions (1) -----> (n) affinity_records  
chat_sessions (1) -----> (n) memory_unlocks
chat_sessions (1) -----> (n) emotion_analysis
```

## 7. 安全与合规设计

### 7.1 内容安全机制

#### 7.1.1 恶魔角色限制
```typescript
interface SafetyConfig {
  demonLimitations: {
    prohibitedTopics: string[]
    maxConsecutiveNegative: number
    interventionTriggers: string[]
    escalationThresholds: {
      selfHarm: number
      violence: number
      illegal: number
    }
  }
}
```

#### 7.1.2 自动干预系统
```typescript
interface InterventionSystem {
  triggers: {
    consecutiveDemonChoices: number
    negativeEmotionDuration: number
    selfHarmKeywords: string[]
  }
  actions: {
    forceAngelMode: boolean
    showSupportResources: boolean
    limitDemonResponses: boolean
    notifyModerators: boolean
  }
}
```

### 7.2 隐私保护

#### 7.2.1 数据加密
- 对话内容端到端加密
- 敏感信息脱敏处理
- 定期数据清理机制

#### 7.2.2 用户控制
- 对话历史导出/删除
- 个人数据下载权限
- 账户完全删除选项

## 8. 性能优化策略

### 8.1 缓存策略
```typescript
interface CacheStrategy {
  ttsCache: {
    ttl: 3600, // 1小时
    maxSize: '100MB'
  },
  emotionAnalysis: {
    ttl: 300, // 5分钟
    maxEntries: 1000
  },
  memoryFragments: {
    ttl: 86400, // 24小时
    preload: true
  }
}
```

### 8.2 API限流
```typescript
interface RateLimiting {
  chat: {
    windowMs: 60000, // 1分钟
    max: 30 // 30条消息
  },
  tts: {
    windowMs: 60000,
    max: 10 // 10次语音生成
  },
  emotion: {
    windowMs: 60000,
    max: 50 // 50次情绪分析
  }
}
```

## 9. 监控与分析

### 9.1 业务指标
- 用户活跃度 (DAU/MAU)
- 对话轮次分布
- 角色切换频率
- 记忆片段解锁率
- 用户留存率

### 9.2 技术指标
- API响应时间
- 错误率统计
- 缓存命中率
- 数据库性能
- 语音生成延迟

## 10. 部署与运维

### 10.1 环境配置
```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - TTS_SERVICE_KEY=${TTS_SERVICE_KEY}
    ports:
      - "3000:3000"
  
  database:
    image: postgres:15
    environment:
      - POSTGRES_DB=linx_chat
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### 10.2 健康检查
```http
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy", 
    "ai_service": "healthy",
    "tts_service": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "memory_usage": "45%",
    "cpu_usage": "12%"
  }
}
```

## 11. 总结

本API设计文档详细描述了恶魔天使版聊天智能体的完整技术架构。系统成功实现了游戏策划案中的核心功能，包括双角色系统、情绪驱动切换、道德选择系统和记忆片段机制。

### 11.1 已实现功能
- ✅ 完整的双角色对话系统
- ✅ 智能的情绪分析和角色切换
- ✅ 道德选择和亲和度系统
- ✅ 20个分类记忆片段
- ✅ 个性化语音合成
- ✅ 实时对话和流式响应

### 11.2 待完善功能
- ⚠️ 新手引导系统
- ⚠️ 内心辩论模式
- ⚠️ 安全监控和干预机制
- ⚠️ 用户画像和个性化推荐

### 11.3 技术优势
- 模块化的服务架构
- 完善的类型定义
- 灵活的角色切换机制
- 丰富的情绪分析能力
- 可扩展的记忆系统

这个API设计为用户提供了一个既有深度又安全的内心探索体验，通过恶魔与天使的对话，让用户在娱乐中思考人性的复杂性和道德选择的重要性。