// 情绪分析工具类
export interface EmotionResult {
  emotion: EmotionType
  intensity: number // 0-1 强度
  confidence: number // 0-1 置信度
  keywords: string[] // 触发关键词
  context: string // 情境描述
}

export type EmotionType = 
  | 'negative' // 消极情绪
  | 'positive' // 积极情绪
  | 'dependency' // 依赖情绪
  | 'technical' // 技术讨论
  | 'provocative' // 挑衅情绪
  | 'neutral' // 中性情绪

export interface PersonalityTrigger {
  emotion: EmotionType
  targetPersonality: string
  threshold: number // 触发阈值
  priority: number // 优先级
}

export class EmotionAnalyzer {
  // 情绪关键词词典
  private emotionKeywords = {
    negative: {
      keywords: [
        '难过', '伤心', '痛苦', '绝望', '沮丧', '失望', '焦虑', '担心', '害怕', '恐惧',
        '愤怒', '生气', '烦躁', '郁闷', '无聊', '孤独', '寂寞', '空虚', '迷茫', '困惑',
        '压力', '疲惫', '累', '烦', '讨厌', '恨', '后悔', '自责', '内疚', '羞愧',
        '不开心', '不爽', '糟糕', '倒霉', '失败', '挫折', '打击', '受伤', '心碎', '崩溃',
        '想哭', '眼泪', '泪水', '哭泣', '呜呜', '555', 'T_T', '(╥﹏╥)', '😭', '😢'
      ],
      intensity: 0.8
    },
    positive: {
      keywords: [
        '开心', '高兴', '快乐', '兴奋', '激动', '喜悦', '愉快', '满足', '幸福', '甜蜜',
        '感动', '温暖', '舒服', '放松', '轻松', '自在', '惊喜', '意外', '棒', '好',
        '赞', '厉害', '牛', '优秀', '完美', '美好', '精彩', '有趣', '好玩', '搞笑',
        '哈哈', '嘻嘻', '呵呵', '笑', '微笑', '大笑', '爽', '舒服', '满意', '赞同',
        '喜欢', '爱', '爱你', '么么哒', '(≧∇≦)', '(｡◕‿◕｡)', '😊', '😄', '😍', '🥰'
      ],
      intensity: 0.7
    },
    dependency: {
      keywords: [
        '需要你', '离不开', '依赖', '陪伴', '陪我', '不要走', '别离开', '舍不得', '想你',
        '思念', '挂念', '牵挂', '在乎', '关心', '担心你', '保护', '照顾', '守护', '依靠',
        '支持', '帮助', '安慰', '理解', '懂我', '知心', '贴心', '暖心', '温柔', '体贴',
        '信任', '相信', '依赖感', '安全感', '归属感', '亲密', '亲近', '亲密无间', '形影不离',
        '七崽', '宝贝', '亲爱的', '小可爱', '抱抱', '拥抱', '贴贴', '蹭蹭', '撒娇', '黏人'
      ],
      intensity: 0.9
    },
    technical: {
      keywords: [
        '代码', '编程', '算法', '数据结构', '函数', '变量', '循环', '条件', '判断', '逻辑',
        '技术', '开发', '软件', '硬件', '系统', '网络', '数据库', '服务器', 'API', '接口',
        '框架', '库', '工具', '平台', '语言', 'Python', 'JavaScript', 'Java', 'C++', 'Go',
        '前端', '后端', '全栈', '移动端', 'Web', 'APP', '网站', '应用', '项目', '产品',
        '调试', '测试', '部署', '运维', '优化', '性能', '安全', '架构', '设计', '模式',
        '学习', '教程', '文档', '资料', '书籍', '课程', '培训', '认证', '考试', '面试'
      ],
      intensity: 0.6
    },
    provocative: {
      keywords: [
        '挑战', '质疑', '反驳', '不同意', '反对', '批评', '指责', '抱怨', '不满', '争论',
        '辩论', '较真', '杠', '抬杠', '找茬', '挑刺', '故意', '刁难', '为难', '刺激',
        '激怒', '惹', '气', '怼', '怼你', '不服', '不爽', '凭什么', '为什么', '怎么可能',
        '胡说', '扯淡', '废话', '无聊', '幼稚', '天真', '愚蠢', '笨', '傻', '蠢',
        '测试', '试探', '考验', '验证', '证明', '比较', '竞争', '较量', '对抗', '挑衅'
      ],
      intensity: 0.7
    }
  }

  // 人格切换规则
  private personalityTriggers: PersonalityTrigger[] = [
    { emotion: 'negative', targetPersonality: 'warm', threshold: 0.6, priority: 9 },
    { emotion: 'dependency', targetPersonality: 'warm', threshold: 0.7, priority: 8 },
    { emotion: 'technical', targetPersonality: 'tech', threshold: 0.5, priority: 6 },
    { emotion: 'provocative', targetPersonality: 'defensive', threshold: 0.6, priority: 7 },
    { emotion: 'positive', targetPersonality: 'tsundere', threshold: 0.5, priority: 5 }
  ]

  // 情绪分析主方法
  analyzeEmotion(text: string, context?: any): EmotionResult {
    const normalizedText = this.normalizeText(text)
    const results: Array<{ emotion: EmotionType; score: number; keywords: string[] }> = []

    // 分析各种情绪
    for (const [emotion, config] of Object.entries(this.emotionKeywords)) {
      const analysis = this.analyzeEmotionType(normalizedText, emotion as EmotionType, config)
      if (analysis.score > 0) {
        results.push(analysis)
      }
    }

    // 如果没有检测到明显情绪，返回中性
    if (results.length === 0) {
      return {
        emotion: 'neutral',
        intensity: 0.1,
        confidence: 0.8,
        keywords: [],
        context: '中性对话'
      }
    }

    // 选择得分最高的情绪
    const topResult = results.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    )

    // 计算置信度
    const confidence = this.calculateConfidence(topResult.score, results.length, text.length)

    return {
      emotion: topResult.emotion,
      intensity: Math.min(topResult.score, 1.0),
      confidence,
      keywords: topResult.keywords,
      context: this.generateContext(topResult.emotion, topResult.keywords)
    }
  }

  // 分析特定情绪类型
  private analyzeEmotionType(
    text: string, 
    emotion: EmotionType, 
    config: { keywords: string[]; intensity: number }
  ): { emotion: EmotionType; score: number; keywords: string[] } {
    const foundKeywords: string[] = []
    let score = 0

    for (const keyword of config.keywords) {
      const regex = new RegExp(keyword, 'gi')
      const matches = text.match(regex)
      if (matches) {
        foundKeywords.push(keyword)
        // 基础分数 + 出现次数加成
        score += config.intensity * (1 + (matches.length - 1) * 0.2)
      }
    }

    // 长度惩罚：文本越长，单个关键词的权重越小
    const lengthPenalty = Math.max(0.3, 1 - text.length / 200)
    score *= lengthPenalty

    // 关键词密度加成
    if (foundKeywords.length > 1) {
      score *= (1 + foundKeywords.length * 0.1)
    }

    return { emotion, score, keywords: foundKeywords }
  }

  // 文本标准化
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 保留中文、英文、数字和空格
      .trim()
  }

  // 计算置信度
  private calculateConfidence(score: number, emotionCount: number, textLength: number): number {
    let confidence = score

    // 文本长度影响置信度
    if (textLength < 10) {
      confidence *= 0.7 // 短文本置信度降低
    } else if (textLength > 50) {
      confidence *= 1.2 // 长文本置信度提高
    }

    // 多种情绪竞争时降低置信度
    if (emotionCount > 2) {
      confidence *= 0.8
    }

    return Math.min(Math.max(confidence, 0.1), 1.0)
  }

  // 生成情境描述
  private generateContext(emotion: EmotionType, keywords: string[]): string {
    const contexts = {
      negative: '用户表达了消极情绪，需要安慰和支持',
      positive: '用户心情愉快，可以进行轻松的对话',
      dependency: '用户表现出依赖倾向，需要温暖的陪伴',
      technical: '用户在讨论技术话题，需要专业的回应',
      provocative: '用户可能在挑衅或测试，需要谨慎回应',
      neutral: '普通的日常对话'
    }

    let context = contexts[emotion]
    if (keywords.length > 0) {
      context += `，关键词：${keywords.slice(0, 3).join('、')}`
    }

    return context
  }

  // 获取推荐的人格切换
  getPersonalityRecommendation(emotionResult: EmotionResult, currentPersonality: string): {
    shouldSwitch: boolean
    targetPersonality: string
    reason: string
    priority: number
  } {
    const triggers = this.personalityTriggers
      .filter(trigger => trigger.emotion === emotionResult.emotion)
      .filter(trigger => emotionResult.intensity >= trigger.threshold)
      .sort((a, b) => b.priority - a.priority)

    if (triggers.length === 0) {
      return {
        shouldSwitch: false,
        targetPersonality: currentPersonality,
        reason: '当前情绪不需要切换人格',
        priority: 0
      }
    }

    const bestTrigger = triggers[0]
    
    // 如果已经是目标人格，不需要切换
    if (currentPersonality === bestTrigger.targetPersonality) {
      return {
        shouldSwitch: false,
        targetPersonality: currentPersonality,
        reason: '已经是最适合的人格模式',
        priority: bestTrigger.priority
      }
    }

    return {
      shouldSwitch: true,
      targetPersonality: bestTrigger.targetPersonality,
      reason: this.getPersonalitySwitchReason(emotionResult.emotion, bestTrigger.targetPersonality),
      priority: bestTrigger.priority
    }
  }

  // 获取人格切换原因
  private getPersonalitySwitchReason(emotion: EmotionType, targetPersonality: string): string {
    const reasons = {
      negative: {
        warm: '检测到消极情绪，切换到治愈暖心模式提供安慰'
      },
      dependency: {
        warm: '感受到依赖需求，切换到治愈暖心模式给予温暖'
      },
      technical: {
        tech: '进入技术讨论，切换到科技高冷模式提供专业回应'
      },
      provocative: {
        defensive: '检测到挑衅行为，切换到防御模式保护自己'
      },
      positive: {
        tsundere: '心情不错呢，切换到傲娇模式增加趣味性'
      }
    }

    return reasons[emotion]?.[targetPersonality] || '根据对话情境智能切换人格'
  }

  // 获取情绪强度描述
  getIntensityDescription(intensity: number): string {
    if (intensity >= 0.8) return '非常强烈'
    if (intensity >= 0.6) return '比较强烈'
    if (intensity >= 0.4) return '中等强度'
    if (intensity >= 0.2) return '轻微'
    return '很轻微'
  }

  // 获取情绪类型描述
  getEmotionDescription(emotion: EmotionType): string {
    const descriptions = {
      negative: '消极情绪',
      positive: '积极情绪',
      dependency: '依赖情绪',
      technical: '技术讨论',
      provocative: '挑衅情绪',
      neutral: '中性情绪'
    }
    return descriptions[emotion]
  }
}

// 导出单例实例
export const emotionAnalyzer = new EmotionAnalyzer()