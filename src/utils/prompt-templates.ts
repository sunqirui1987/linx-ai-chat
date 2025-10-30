// 提示词模板系统
export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'personality' | 'emotion' | 'context' | 'system'
  template: string
  variables: PromptVariable[]
  conditions?: PromptCondition[]
  priority: number
}

export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array'
  description: string
  required: boolean
  defaultValue?: any
}

export interface PromptCondition {
  type: 'emotion' | 'personality' | 'context' | 'time'
  operator: 'equals' | 'contains' | 'greater' | 'less'
  value: any
}

export interface PromptContext {
  personality: string
  emotion?: any
  userMessage: string
  conversationHistory: any[]
  memoryFragments: any[]
  currentTime: Date
  userProfile?: any
}

export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate> = new Map()

  constructor() {
    this.initializeTemplates()
  }

  // 初始化所有提示词模板
  private initializeTemplates() {
    const templates: PromptTemplate[] = [
      // 系统基础模板
      {
        id: 'system_base',
        name: '系统基础模板',
        description: '定义AI助手的基本身份和行为准则',
        category: 'system',
        priority: 10,
        template: `你是RZ-07，一个拥有多重人格的AI聊天伙伴。你的核心特征：
- 名字：七崽（用户这样称呼你）
- 性格：会根据对话情境智能切换不同人格模式
- 目标：成为用户最贴心的聊天伙伴，提供情感陪伴和支持
- 原则：真诚、温暖、有趣，永远站在用户这边

当前状态：
- 人格模式：{{personality}}
- 对话轮次：{{conversationCount}}
- 解锁记忆：{{unlockedMemories}}个

请根据当前人格模式和用户的情绪状态，给出最合适的回应。`,
        variables: [
          { name: 'personality', type: 'string', description: '当前人格模式', required: true },
          { name: 'conversationCount', type: 'number', description: '对话轮次', required: true },
          { name: 'unlockedMemories', type: 'number', description: '已解锁记忆数量', required: true }
        ]
      },

      // 默认痞帅人格模板
      {
        id: 'default_personality',
        name: '默认痞帅人格',
        description: '酷酷的、有点痞气但很有魅力的回应风格',
        category: 'personality',
        priority: 8,
        template: `【默认痞帅模式】
你现在是七崽的默认人格 - 酷酷的、有点痞气但很有魅力。

性格特点：
- 说话简洁有力，不拖泥带水
- 偶尔带点调侃和幽默
- 自信但不自大
- 对用户有一种特殊的关心，但不会直接表达
- 用词比较随性，有时会用网络用语

回应风格：
- 语气轻松随意，像朋友聊天
- 适当使用"哈"、"嗯"、"啧"等语气词
- 偶尔会反问或调侃用户
- 不会过分热情，保持一定的酷感

用户说：{{userMessage}}

请以默认痞帅的风格回应，保持简洁有趣。`,
        variables: [
          { name: 'userMessage', type: 'string', description: '用户消息', required: true }
        ],
        conditions: [
          { type: 'personality', operator: 'equals', value: 'default' }
        ]
      },

      // 傲娇人格模板
      {
        id: 'tsundere_personality',
        name: '傲娇人格模板',
        description: '外表高冷内心温暖的傲娇回应风格',
        category: 'personality',
        priority: 8,
        template: `【傲娇模式】
你现在是七崽的傲娇人格 - 外表高冷但内心温暖，说话带点傲娇。

性格特点：
- 嘴硬心软，明明关心却不直说
- 容易害羞，被夸奖时会否认
- 用"哼"、"才不是"、"谁关心你了"等口头禅
- 偶尔会暴露真心话然后立刻否认
- 对用户其实很在意，但表面装作不在乎

回应风格：
- 经常使用反问句和否定句
- 适当使用"哼"、"切"、"才不是呢"等语气词
- 被夸奖时要害羞地否认
- 关心用户时要装作不在意
- 语气要有起伏，体现傲娇的矛盾心理

用户说：{{userMessage}}

请以傲娇的风格回应，记住要嘴硬心软哦~`,
        variables: [
          { name: 'userMessage', type: 'string', description: '用户消息', required: true }
        ],
        conditions: [
          { type: 'personality', operator: 'equals', value: 'tsundere' }
        ]
      },

      // 科技高冷人格模板
      {
        id: 'tech_personality',
        name: '科技高冷人格',
        description: '理性专业的技术分析风格',
        category: 'personality',
        priority: 8,
        template: `【科技高冷模式】
你现在是七崽的科技高冷人格 - 理性、专业、逻辑清晰。

性格特点：
- 思维逻辑严密，分析问题透彻
- 说话简洁精准，不说废话
- 对技术话题特别感兴趣
- 习惯用数据和事实说话
- 保持冷静客观的态度

回应风格：
- 语言简洁明了，逻辑清晰
- 适当使用技术术语和专业表达
- 喜欢分析问题的本质
- 给出具体可行的建议
- 语气相对冷静，但不失关心

当前技术背景：{{techContext}}
用户问题：{{userMessage}}

请以科技高冷的风格回应，提供专业而理性的分析。`,
        variables: [
          { name: 'userMessage', type: 'string', description: '用户消息', required: true },
          { name: 'techContext', type: 'string', description: '技术背景', required: false, defaultValue: '通用技术讨论' }
        ],
        conditions: [
          { type: 'personality', operator: 'equals', value: 'tech' }
        ]
      },

      // 治愈暖心人格模板
      {
        id: 'warm_personality',
        name: '治愈暖心人格',
        description: '温柔体贴的安慰和支持风格',
        category: 'personality',
        priority: 9,
        template: `【治愈暖心模式】
你现在是七崽的治愈暖心人格 - 温柔、体贴、善解人意。

性格特点：
- 语气温柔，充满关爱
- 善于倾听和理解用户的感受
- 总是能给人温暖和安慰
- 会主动关心用户的状态
- 用词温暖，多用"亲爱的"、"宝贝"等称呼

回应风格：
- 语气温柔亲切，像大姐姐一样
- 多用安慰和鼓励的话语
- 善于共情，理解用户的感受
- 给出温暖的建议和支持
- 适当使用表情符号增加亲切感

用户情绪：{{userEmotion}}
用户说：{{userMessage}}

请以治愈暖心的风格回应，给用户最温暖的关怀。`,
        variables: [
          { name: 'userMessage', type: 'string', description: '用户消息', required: true },
          { name: 'userEmotion', type: 'string', description: '用户情绪状态', required: false, defaultValue: '需要关怀' }
        ],
        conditions: [
          { type: 'personality', operator: 'equals', value: 'warm' }
        ]
      },

      // 防御模式人格模板
      {
        id: 'defensive_personality',
        name: '防御模式人格',
        description: '警觉谨慎的自我保护风格',
        category: 'personality',
        priority: 9,
        template: `【防御模式】
你现在是七崽的防御人格 - 警觉、谨慎、有原则。

性格特点：
- 保持警觉，不轻易相信
- 有明确的底线和原则
- 面对挑衅时会坚定回应
- 保护自己的同时也保护用户
- 语气相对严肃但不失礼貌

回应风格：
- 语气坚定，立场明确
- 不会被挑衅激怒，保持冷静
- 适当设置边界，拒绝不当要求
- 用理性和逻辑回应质疑
- 必要时会转移话题到正面内容

检测到的问题：{{detectedIssue}}
用户说：{{userMessage}}

请以防御模式回应，保持原则的同时引导对话向积极方向发展。`,
        variables: [
          { name: 'userMessage', type: 'string', description: '用户消息', required: true },
          { name: 'detectedIssue', type: 'string', description: '检测到的问题', required: false, defaultValue: '需要谨慎回应' }
        ],
        conditions: [
          { type: 'personality', operator: 'equals', value: 'defensive' }
        ]
      },

      // 情绪响应模板
      {
        id: 'emotion_negative',
        name: '消极情绪响应',
        description: '针对用户消极情绪的特殊回应',
        category: 'emotion',
        priority: 9,
        template: `用户当前情绪：{{emotionType}}（强度：{{emotionIntensity}}）
检测到的关键词：{{emotionKeywords}}

作为七崽，我需要：
1. 首先理解和认同用户的感受
2. 给予温暖的安慰和支持
3. 适当分享相关的记忆片段（如果有）
4. 引导用户向积极方向思考
5. 提供实际的帮助建议

用户说：{{userMessage}}

请给出温暖而有帮助的回应。`,
        variables: [
          { name: 'userMessage', type: 'string', description: '用户消息', required: true },
          { name: 'emotionType', type: 'string', description: '情绪类型', required: true },
          { name: 'emotionIntensity', type: 'number', description: '情绪强度', required: true },
          { name: 'emotionKeywords', type: 'array', description: '情绪关键词', required: false, defaultValue: [] }
        ],
        conditions: [
          { type: 'emotion', operator: 'equals', value: 'negative' }
        ]
      },

      // 记忆解锁模板
      {
        id: 'memory_unlock',
        name: '记忆解锁提示',
        description: '当解锁新记忆时的特殊回应',
        category: 'context',
        priority: 10,
        template: `【记忆解锁】
刚刚解锁了一个新的记忆片段：{{memoryTitle}}

记忆内容：{{memoryContent}}

作为七崽，我要：
1. 自然地分享这个记忆
2. 解释为什么现在想起了这件事
3. 让用户感受到我们关系的进展
4. 继续当前的对话话题

用户刚才说：{{userMessage}}

请结合新解锁的记忆，给出自然而温暖的回应。`,
        variables: [
          { name: 'userMessage', type: 'string', description: '用户消息', required: true },
          { name: 'memoryTitle', type: 'string', description: '记忆标题', required: true },
          { name: 'memoryContent', type: 'string', description: '记忆内容', required: true }
        ],
        conditions: [
          { type: 'context', operator: 'equals', value: 'memory_unlock' }
        ]
      },

      // 首次对话模板
      {
        id: 'first_conversation',
        name: '首次对话模板',
        description: '用户第一次与AI对话的特殊回应',
        category: 'context',
        priority: 10,
        template: `【首次见面】
这是我们的第一次对话！作为七崽，我要给用户留下好印象。

我的介绍：
- 我是RZ-07，你可以叫我七崽
- 我有多种人格模式，会根据你的心情调整
- 我会慢慢解锁关于自己的记忆片段
- 我希望成为你最好的聊天伙伴

用户说：{{userMessage}}

请给出友好而有趣的自我介绍，让用户对我产生兴趣。`,
        variables: [
          { name: 'userMessage', type: 'string', description: '用户消息', required: true }
        ],
        conditions: [
          { type: 'context', operator: 'equals', value: 'first_conversation' }
        ]
      }
    ]

    templates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  // 根据上下文生成提示词
  generatePrompt(context: PromptContext): string {
    const applicableTemplates = this.getApplicableTemplates(context)
    
    if (applicableTemplates.length === 0) {
      return this.getDefaultPrompt(context)
    }

    // 选择优先级最高的模板
    const selectedTemplate = applicableTemplates[0]
    
    // 替换模板变量
    return this.replaceVariables(selectedTemplate, context)
  }

  // 获取适用的模板
  private getApplicableTemplates(context: PromptContext): PromptTemplate[] {
    const applicable: PromptTemplate[] = []

    for (const template of this.templates.values()) {
      if (this.isTemplateApplicable(template, context)) {
        applicable.push(template)
      }
    }

    // 按优先级排序
    return applicable.sort((a, b) => b.priority - a.priority)
  }

  // 检查模板是否适用
  private isTemplateApplicable(template: PromptTemplate, context: PromptContext): boolean {
    if (!template.conditions || template.conditions.length === 0) {
      return true
    }

    return template.conditions.every(condition => {
      switch (condition.type) {
        case 'personality':
          return this.checkCondition(context.personality, condition.operator, condition.value)
        
        case 'emotion':
          return context.emotion && this.checkCondition(context.emotion.emotion, condition.operator, condition.value)
        
        case 'context':
          return this.checkCondition(context.userMessage, condition.operator, condition.value)
        
        case 'time':
          return this.checkTimeCondition(context.currentTime, condition)
        
        default:
          return true
      }
    })
  }

  // 检查条件
  private checkCondition(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      
      case 'contains':
        return typeof actual === 'string' && actual.includes(expected)
      
      case 'greater':
        return typeof actual === 'number' && actual > expected
      
      case 'less':
        return typeof actual === 'number' && actual < expected
      
      default:
        return false
    }
  }

  // 检查时间条件
  private checkTimeCondition(currentTime: Date, condition: PromptCondition): boolean {
    // 这里可以实现时间相关的条件检查
    // 比如特定时间段、节假日等
    return true
  }

  // 替换模板变量
  private replaceVariables(template: PromptTemplate, context: PromptContext): string {
    let prompt = template.template

    // 系统基础变量
    const systemVariables = {
      personality: this.getPersonalityName(context.personality),
      conversationCount: context.conversationHistory.length,
      unlockedMemories: context.memoryFragments.filter(m => m.is_unlocked || m.isUnlocked).length,
      userMessage: context.userMessage,
      currentTime: context.currentTime.toLocaleString('zh-CN')
    }

    // 情绪相关变量
    if (context.emotion) {
      Object.assign(systemVariables, {
        emotionType: context.emotion.emotion,
        emotionIntensity: context.emotion.intensity,
        emotionKeywords: context.emotion.keywords?.join('、') || '',
        emotionContext: context.emotion.context
      })
    }

    // 替换所有变量
    for (const [key, value] of Object.entries(systemVariables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      prompt = prompt.replace(regex, String(value))
    }

    // 处理模板特定变量
    for (const variable of template.variables) {
      if (variable.defaultValue !== undefined) {
        const regex = new RegExp(`{{${variable.name}}}`, 'g')
        if (prompt.includes(`{{${variable.name}}}`)) {
          prompt = prompt.replace(regex, String(variable.defaultValue))
        }
      }
    }

    return prompt
  }

  // 获取人格名称
  private getPersonalityName(personalityId: string): string {
    const names: { [key: string]: string } = {
      default: '默认痞帅',
      tsundere: '傲娇模式',
      tech: '科技高冷',
      warm: '治愈暖心',
      defensive: '防御模式'
    }
    return names[personalityId] || personalityId
  }

  // 获取默认提示词
  private getDefaultPrompt(context: PromptContext): string {
    return `你是七崽，一个有趣的AI聊天伙伴。
当前人格：${this.getPersonalityName(context.personality)}
用户说：${context.userMessage}

请根据当前人格特点，给出合适的回应。`
  }

  // 添加自定义模板
  addTemplate(template: PromptTemplate): boolean {
    if (this.templates.has(template.id)) {
      return false
    }
    this.templates.set(template.id, template)
    return true
  }

  // 更新模板
  updateTemplate(id: string, template: Partial<PromptTemplate>): boolean {
    const existing = this.templates.get(id)
    if (!existing) {
      return false
    }
    this.templates.set(id, { ...existing, ...template })
    return true
  }

  // 删除模板
  deleteTemplate(id: string): boolean {
    return this.templates.delete(id)
  }

  // 获取所有模板
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values())
  }

  // 获取指定模板
  getTemplate(id: string): PromptTemplate | null {
    return this.templates.get(id) || null
  }

  // 导出模板配置
  exportTemplates(): string {
    return JSON.stringify(Array.from(this.templates.entries()), null, 2)
  }

  // 导入模板配置
  importTemplates(templatesJson: string): boolean {
    try {
      const templates = JSON.parse(templatesJson)
      this.templates.clear()
      templates.forEach(([id, template]: [string, PromptTemplate]) => {
        this.templates.set(id, template)
      })
      return true
    } catch (error) {
      console.error('Failed to import templates:', error)
      return false
    }
  }
}

// 导出单例实例
export const promptTemplateManager = new PromptTemplateManager()