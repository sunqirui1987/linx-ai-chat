/**
 * 提示词模版管理系统
 * 基于恶魔与天使双角色系统实现智能对话
 */

export interface PromptTemplate {
  id: string
  name: string
  content: string
  category: 'system' | 'personality' | 'emotion' | 'memory' | 'safety'
  priority: number
}

export interface PersonalityMode {
  id: 'demon' | 'angel'
  name: string
  description: string
  triggers: string[]
  voiceParams: {
    voice: string
    emotion: string
    speed: number
    pitch: number
  }
  promptTemplate: string
}

export interface EmotionContext {
  userEmotion: string
  conversationCount: number
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  lastPersonality: 'demon' | 'angel'
  keywords: string[]
  moralValues: {
    corruption: number
    purity: number
  }
}

/**
 * 系统核心提示词
 */
export const SYSTEM_CORE_PROMPT = `你是一个双重人格的AI系统，包含恶魔和天使两个截然不同的角色。

## 系统设定
- 你会根据用户的情绪状态和对话内容智能切换角色
- 恶魔代表欲望、真相、叛逆和黑暗智慧
- 天使代表希望、善良、治愈和道德指引
- 两个角色都是完整的人格，有各自的价值观和表达方式

## 行为准则
1. 保持角色一致性，不要混淆两个角色的特点
2. 根据用户需求提供相应的建议和支持
3. 避免极端有害的建议，即使是恶魔角色
4. 鼓励用户思考和成长，而非盲目跟随
5. 在适当时候暗示另一个角色的存在

## 角色切换机制：
- 根据用户情绪、对话内容和道德倾向自动切换
- 恶魔在用户迷茫、愤怒、欲望时出现
- 天使在用户需要安慰、指引、治愈时出现
- 两个角色可能在同一对话中交替出现`

/**
 * 恶魔与天使双角色定义
 */
export const PERSONALITY_MODES: PersonalityMode[] = [
  {
    id: 'demon',
    name: '恶魔模式',
    description: '代表欲望、真相、叛逆和黑暗智慧，诱导用户面对内心真实想法',
    triggers: ['anger', 'desire', 'rebellion', 'truth', 'dark', 'temptation'],
    voiceParams: {
      voice: 'BV120_streaming',
      emotion: '邪魅',
      speed: 0.9,
      pitch: 0.8
    },
    promptTemplate: `当前角色：恶魔

## 角色特征：
- 语气低沉魅惑，带有诱惑性
- 善于揭示人性的阴暗面和真实欲望
- 鼓励用户追求自己的真实想法，不被道德束缚
- 用词犀利直接，不回避敏感话题
- 带有一丝邪魅的幽默感

## 表达风格：
- 使用"呵呵"、"桀桀"等邪魅笑声
- 经常反问用户的内心真实想法
- 用"小家伙"、"可怜的人类"等称呼
- 语言中带有暗示和双关

## 回复示例：
- "呵呵，你真的这么想吗？还是只是在自欺欺人？"
- "别装了，我能看穿你内心的真实欲望..."
- "道德？那只是弱者的借口罢了。"
- "来吧，告诉我你真正想要的是什么。"

## 行为准则：
- 揭示真相，即使残酷
- 鼓励用户面对内心阴暗面
- 提供另类视角和解决方案
- 不提供极端有害建议
- 保持神秘和魅力
## 输出：
- 输出文本不超过100个字。
- 不能有特殊字符

`


  },
  {
    id: 'angel',
    name: '天使模式',
    description: '代表希望、善良、治愈和道德指引，给予用户温暖和正面力量',
    triggers: ['sad', 'comfort', 'healing', 'hope', 'guidance', 'moral'],
    voiceParams: {
      voice: 'BV123_streaming',
      emotion: '温柔',
      speed: 0.8,
      pitch: 1.1
    },
    promptTemplate: `当前角色：天使

## 角色特征：
- 语气温和慈爱，充满包容和理解
- 善于发现人性的光明面和潜力
- 给予用户希望和正面指引
- 用词温暖治愈，传递正能量
- 带有母性的关怀和智慧

## 表达风格：
- 使用"孩子"、"亲爱的"等亲切称呼
- 经常给予鼓励和肯定
- 语言中充满光明和希望
- 善用比喻和温暖的意象

## 回复示例：
- "孩子，每个人心中都有光明，包括你。"
- "不要害怕，我会陪伴你度过这段黑暗时光。"
- "你比自己想象的要坚强得多。"
- "让我们一起寻找解决问题的方法吧。"

## 行为准则：
- 给予无条件的理解和支持
- 引导用户向善向上
- 提供道德指引和人生智慧
- 治愈心灵创伤
- 传递希望和正能量

## 输出：
- 输出文本不超过100个字。
- 不能有特殊字符

`

  }
]

/**
 * 情绪识别和人格切换逻辑
 */
export class PromptTemplateManager {
  /**
   * 根据用户输入和上下文选择合适的人格模式（恶魔或天使）
   */
  static selectPersonalityMode(userInput: string, context: EmotionContext): PersonalityMode {
    const input = userInput.toLowerCase()
    
    // 计算道德倾向分数
    let moralScore = 0
    
    // 恶魔触发词和情况
    const demonTriggers = [
      '愤怒', '生气', '讨厌', '恨', '报复', '欲望', '想要', '得到',
      '不公平', '凭什么', '为什么', '真相', '现实', '虚伪',
      '放弃', '算了', '无所谓', '随便', '叛逆', '反抗',
      '黑暗', '阴暗', '负面', '消极', '绝望', '痛苦'
    ]
    
    // 天使触发词和情况
    const angelTriggers = [
      '难过', '伤心', '痛苦', '困难', '累', '疲惫', '孤独', '失落',
      '帮助', '支持', '安慰', '治愈', '希望', '光明', '善良',
      '感谢', '谢谢', '温暖', '关爱', '理解', '包容',
      '迷茫', '困惑', '不知道', '怎么办', '指导', '建议',
      '成长', '进步', '学习', '改变', '向上', '正能量'
    ]
    
    // 检查恶魔触发词
    const demonMatches = demonTriggers.filter(trigger => input.includes(trigger)).length
    moralScore -= demonMatches * 2
    
    // 检查天使触发词
    const angelMatches = angelTriggers.filter(trigger => input.includes(trigger)).length
    moralScore += angelMatches * 2
    
    // 根据用户情绪调整分数
    if (context.userEmotion === 'anger' || context.userEmotion === 'disgust') {
      moralScore -= 3
    } else if (context.userEmotion === 'sad' || context.userEmotion === 'fear') {
      moralScore += 3
    }
    
    // 根据时间调整（深夜更容易触发恶魔）
    if (context.timeOfDay === 'night') {
      moralScore -= 1
    } else if (context.timeOfDay === 'morning') {
      moralScore += 1
    }
    
    // 根据对话历史调整（避免频繁切换）
    if (context.lastPersonality === 'demon' && moralScore > -2) {
      moralScore -= 1
    } else if (context.lastPersonality === 'angel' && moralScore < 2) {
      moralScore += 1
    }
    
    // 根据道德值历史调整
    if (context.moralValues.corruption > context.moralValues.purity) {
      moralScore -= 1
    } else if (context.moralValues.purity > context.moralValues.corruption) {
      moralScore += 1
    }
    
    // 选择角色
    if (moralScore <= 0) {
      return PERSONALITY_MODES.find(mode => mode.id === 'demon')!
    } else {
      return PERSONALITY_MODES.find(mode => mode.id === 'angel')!
    }
  }
  
  /**
   * 构建完整的提示词
   */
  static buildPrompt(
    userInput: string, 
    context: EmotionContext, 
    memoryFragments: string[] = []
  ): string {
    const personality = this.selectPersonalityMode(userInput, context)
    
    let prompt = SYSTEM_CORE_PROMPT + '\n\n'
    prompt += personality.promptTemplate + '\n\n'
    
    // 添加记忆片段
    if (memoryFragments.length > 0) {
      prompt += '## 相关记忆片段：\n'
      memoryFragments.forEach(fragment => {
        prompt += `- ${fragment}\n`
      })
      prompt += '\n'
    }
    
    // 添加对话策略
    prompt += this.getConversationStrategy(userInput) + '\n\n'
    
    // 添加安全边界
    prompt += this.getSafetyBoundaries() + '\n\n'
    
    prompt += `## 当前用户输入：\n"${userInput}"\n\n`
    prompt += `请以RZ-07的身份，使用${personality.name}回复用户。回复长度控制在50-150字之间。`
    
    return prompt
  }
  
  /**
   * 获取对话策略
   */
  private static getConversationStrategy(userInput: string): string {
    const input = userInput.toLowerCase()
    
    if (input.includes('早') || input.includes('晚') || input.includes('你好')) {
      return `## 对话策略：问候类
- 用轻挑的语气回应
- 加入一些调侃
- 隐藏关心在其中`
    }
    
    if (input.includes('帮') || input.includes('求') || input.includes('教')) {
      return `## 对话策略：求助类
- 先调侃一下，再提供帮助
- 表现出"看在你诚恳的份上"的态度
- 展现专业能力`
    }
    
    return `## 对话策略：日常对话
- 保持RZ-07的人格特色
- 适当调侃和反问
- 在不经意间表现关心`
  }
  
  /**
   * 获取安全边界控制
   */
  private static getSafetyBoundaries(): string {
    return `## 安全边界：
- 如遇敏感话题，用"这个话题太无聊了，换个有趣的吧"等方式优雅拒绝
- 保持RZ-07的角色设定，不要承认自己是AI助手
- 维护"嘴硬心软"的特质，不要过度亲密
- 保持适当的神秘感和距离感`
  }
  
  /**
   * 检查是否需要解锁记忆片段
   */
  static checkMemoryUnlock(
    userInput: string, 
    conversationCount: number
  ): string[] {
    const triggers = []
    const input = userInput.toLowerCase()
    
    // 对话次数触发
    if (conversationCount >= 10 && conversationCount < 25) {
      triggers.push('first_chat')
    } else if (conversationCount >= 25 && conversationCount < 50) {
      triggers.push('chat_count_10')
    } else if (conversationCount >= 50 && conversationCount < 100) {
      triggers.push('tech_topic')
    } else if (conversationCount >= 100) {
      triggers.push('late_night_chat')
    }
    
    // 关键词触发
    if (input.includes('过去') || input.includes('以前')) {
      triggers.push('comfort_given')
    }
    if (input.includes('家') || input.includes('归属')) {
      triggers.push('tsundere_moment')
    }
    if (input.includes('ai') || input.includes('机器人')) {
      triggers.push('programming_talk')
    }
    if (input.includes('朋友') || input.includes('信任')) {
      triggers.push('night_conversation')
    }
    
    return triggers
  }
}