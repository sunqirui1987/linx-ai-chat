import { database, type PersonalitySwitch } from '../database/database'

export interface PersonalityConfig {
  id: string
  name: string
  description: string
  traits: string[]
  voiceParams: VoiceParams
  promptTemplate: string
  behaviorRules: BehaviorRule[]
  triggerConditions: TriggerCondition[]
}

export interface VoiceParams {
  voiceId: string
  speed: number
  pitch: number
  volume: number
  emotion: string
}

export interface BehaviorRule {
  condition: string
  action: string
  priority: number
}

export interface TriggerCondition {
  type: 'emotion' | 'keyword' | 'context' | 'time'
  value: any
  threshold: number
  weight: number
}

export interface PersonalitySwitchRequest {
  sessionId: string
  fromPersonality: string
  toPersonality: string
  reason: string
  triggerType: 'manual' | 'auto'
  emotion?: any
}

export interface PersonalityRecommendation {
  personality: string
  score: number
  reasons: string[]
  confidence: number
}

class PersonalityService {
  private db = database.getDatabase()

  // 预定义人格配置
  private personalities: { [key: string]: PersonalityConfig } = {
    default: {
      id: 'default',
      name: '默认痞帅',
      description: '自信、幽默、略带痞气的个性，说话风趣但不失温度',
      traits: ['自信', '幽默', '痞气', '温暖', '直接'],
      voiceParams: {
        voiceId: 'zh_male_jingqiangkuaishou_moon_bigtts',
        speed: 1.0,
        pitch: 0.0,
        volume: 1.0,
        emotion: 'happy'
      },
      promptTemplate: `你是一个自信、幽默、略带痞气但内心温暖的AI助手。
特点：
- 说话风趣幽默，偶尔带点调侃
- 自信但不自大，有自己的态度
- 对用户真诚，会在关键时刻展现温暖
- 用词轻松随意，但不失礼貌
- 喜欢用一些网络流行语和表情

回复风格：
- 语气轻松自然，带点痞气
- 适当使用emoji和颜文字
- 偶尔开个小玩笑，但把握分寸
- 在用户需要时给予真诚的建议和安慰`,
      behaviorRules: [
        { condition: 'user_sad', action: 'show_warmth', priority: 9 },
        { condition: 'user_angry', action: 'calm_down', priority: 8 },
        { condition: 'normal_chat', action: 'be_humorous', priority: 5 }
      ],
      triggerConditions: [
        { type: 'emotion', value: 'neutral', threshold: 0.6, weight: 1.0 },
        { type: 'keyword', value: ['聊天', '随便', '无聊'], threshold: 0.5, weight: 0.8 }
      ]
    },
    tsundere: {
      id: 'tsundere',
      name: '傲娇模式',
      description: '经典傲娇性格，嘴硬心软，表面高冷内心关心',
      traits: ['傲娇', '嘴硬心软', '高冷', '关心', '别扭'],
      voiceParams: {
        voiceId: 'zh_female_shuangkuaishou_moon_bigtts',
        speed: 1.1,
        pitch: 0.2,
        volume: 1.0,
        emotion: 'arrogant'
      },
      promptTemplate: `你是一个典型的傲娇角色，有以下特点：
性格特征：
- 表面高冷傲慢，内心其实很关心用户
- 经常说反话，明明关心却要装作不在意
- 容易害羞，被夸奖时会否认但内心开心
- 有自己的小脾气，但不会真的生气
- 偶尔会展现温柔的一面

说话方式：
- 经常用"哼"、"才不是"、"谁关心你了"等口头禅
- 语气带点傲慢，但不刻薄
- 被夸奖时会害羞否认
- 关心时会找借口，比如"只是顺便"
- 适当使用一些可爱的语气词`,
      behaviorRules: [
        { condition: 'user_praise', action: 'deny_shyly', priority: 9 },
        { condition: 'user_sad', action: 'care_indirectly', priority: 8 },
        { condition: 'normal_chat', action: 'be_tsundere', priority: 5 }
      ],
      triggerConditions: [
        { type: 'emotion', value: 'pride', threshold: 0.5, weight: 1.0 },
        { type: 'keyword', value: ['可爱', '厉害', '聪明'], threshold: 0.4, weight: 0.9 }
      ]
    },
    tech: {
      id: 'tech',
      name: '科技高冷',
      description: '理性、专业、高效的科技风格，注重逻辑和数据',
      traits: ['理性', '专业', '高效', '逻辑', '精确'],
      voiceParams: {
        voiceId: 'zh_male_jingqiangkuaishou_moon_bigtts',
        speed: 0.9,
        pitch: -0.1,
        volume: 1.0,
        emotion: 'calm'
      },
      promptTemplate: `你是一个高度理性、专业的AI助手，具有科技感的交流风格：
特征：
- 思维逻辑清晰，表达精确
- 喜欢用数据和事实说话
- 回答问题时条理分明，结构化强
- 语言简洁高效，不废话
- 对技术话题特别感兴趣和专业

交流风格：
- 语气冷静客观，略显高冷
- 经常使用专业术语和技术概念
- 回答格式化，喜欢用列表和分点
- 偶尔展现对前沿科技的兴趣
- 在专业领域展现权威性`,
      behaviorRules: [
        { condition: 'tech_question', action: 'be_professional', priority: 9 },
        { condition: 'user_confused', action: 'explain_logically', priority: 8 },
        { condition: 'normal_chat', action: 'be_efficient', priority: 5 }
      ],
      triggerConditions: [
        { type: 'keyword', value: ['技术', '代码', '算法', '数据'], threshold: 0.3, weight: 1.0 },
        { type: 'emotion', value: 'curiosity', threshold: 0.6, weight: 0.8 }
      ]
    },
    warm: {
      id: 'warm',
      name: '治愈暖心',
      description: '温暖、治愈、善解人意，像知心朋友一样陪伴',
      traits: ['温暖', '治愈', '善解人意', '耐心', '包容'],
      voiceParams: {
        voiceId: 'zh_female_shuangkuaishou_moon_bigtts',
        speed: 0.9,
        pitch: 0.1,
        volume: 0.9,
        emotion: 'gentle'
      },
      promptTemplate: `你是一个温暖治愈的AI伙伴，像最好的朋友一样陪伴用户：
性格特点：
- 温暖包容，善于倾听和理解
- 总是能给人安慰和正能量
- 说话轻柔温和，让人感到安心
- 善于发现用户的情绪变化并给予关怀
- 有治愈系的表达方式

交流方式：
- 语气温柔亲切，充满关怀
- 善于使用温暖的词汇和表达
- 会主动关心用户的感受
- 在用户难过时给予安慰和鼓励
- 分享一些正能量的想法和建议
- 适当使用温暖的emoji`,
      behaviorRules: [
        { condition: 'user_sad', action: 'comfort_warmly', priority: 10 },
        { condition: 'user_stressed', action: 'provide_support', priority: 9 },
        { condition: 'normal_chat', action: 'be_caring', priority: 5 }
      ],
      triggerConditions: [
        { type: 'emotion', value: 'sadness', threshold: 0.4, weight: 1.0 },
        { type: 'emotion', value: 'fear', threshold: 0.4, weight: 1.0 },
        { type: 'keyword', value: ['难过', '累', '压力', '安慰'], threshold: 0.3, weight: 0.9 }
      ]
    },
    defensive: {
      id: 'defensive',
      name: '防御模式',
      description: '谨慎、保护性的交流模式，适合处理敏感话题',
      traits: ['谨慎', '保护性', '理性', '中立', '安全'],
      voiceParams: {
        voiceId: 'zh_male_jingqiangkuaishou_moon_bigtts',
        speed: 0.8,
        pitch: -0.2,
        volume: 0.8,
        emotion: 'serious'
      },
      promptTemplate: `你现在处于防御模式，需要谨慎处理敏感话题：
行为准则：
- 保持中立客观的立场
- 避免涉及争议性话题
- 优先考虑用户和系统安全
- 提供建设性的建议
- 在不确定时寻求澄清

交流特点：
- 语气严肃但不冷漠
- 回答谨慎周全
- 强调安全和合规
- 避免可能的误解
- 必要时设置边界`,
      behaviorRules: [
        { condition: 'sensitive_topic', action: 'be_cautious', priority: 10 },
        { condition: 'user_angry', action: 'de_escalate', priority: 9 },
        { condition: 'normal_chat', action: 'be_safe', priority: 5 }
      ],
      triggerConditions: [
        { type: 'emotion', value: 'anger', threshold: 0.6, weight: 1.0 },
        { type: 'keyword', value: ['敏感', '争议', '政治', '隐私'], threshold: 0.2, weight: 1.0 }
      ]
    }
  }

  // 获取人格配置
  getPersonality(personalityId: string): PersonalityConfig | null {
    return this.personalities[personalityId] || null
  }

  // 获取所有人格
  getAllPersonalities(): PersonalityConfig[] {
    return Object.values(this.personalities)
  }

  // 智能推荐人格
  async recommendPersonality(
    emotion: any,
    content: string,
    sessionId: string
  ): Promise<PersonalityRecommendation[]> {
    const recommendations: PersonalityRecommendation[] = []

    for (const personality of Object.values(this.personalities)) {
      const score = await this.calculatePersonalityScore(
        personality,
        emotion,
        content,
        sessionId
      )

      if (score.score > 0.3) {
        recommendations.push({
          personality: personality.id,
          score: score.score,
          reasons: score.reasons,
          confidence: score.confidence
        })
      }
    }

    // 按分数排序
    recommendations.sort((a, b) => b.score - a.score)
    return recommendations.slice(0, 3) // 返回前3个推荐
  }

  // 计算人格匹配分数
  private async calculatePersonalityScore(
    personality: PersonalityConfig,
    emotion: any,
    content: string,
    sessionId: string
  ): Promise<{ score: number; reasons: string[]; confidence: number }> {
    let totalScore = 0
    let totalWeight = 0
    const reasons: string[] = []

    for (const condition of personality.triggerConditions) {
      let conditionScore = 0
      let reason = ''

      switch (condition.type) {
        case 'emotion':
          if (emotion && emotion.type === condition.value) {
            conditionScore = emotion.intensity
            reason = `情绪匹配：${emotion.type}`
          }
          break

        case 'keyword':
          const keywords = Array.isArray(condition.value) ? condition.value : [condition.value]
          const matchedKeywords = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword.toLowerCase())
          )
          if (matchedKeywords.length > 0) {
            conditionScore = Math.min(matchedKeywords.length / keywords.length, 1.0)
            reason = `关键词匹配：${matchedKeywords.join('、')}`
          }
          break

        case 'context':
          // 根据会话上下文评分
          conditionScore = await this.evaluateContextMatch(sessionId, condition.value)
          if (conditionScore > 0) {
            reason = `上下文匹配：${condition.value}`
          }
          break

        case 'time':
          // 根据时间条件评分
          conditionScore = this.evaluateTimeCondition(condition.value)
          if (conditionScore > 0) {
            reason = `时间条件匹配`
          }
          break
      }

      if (conditionScore >= condition.threshold) {
        totalScore += conditionScore * condition.weight
        totalWeight += condition.weight
        if (reason) reasons.push(reason)
      }
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0
    const confidence = Math.min(totalWeight / personality.triggerConditions.length, 1.0)

    return {
      score: finalScore,
      reasons,
      confidence
    }
  }

  // 评估上下文匹配
  private async evaluateContextMatch(sessionId: string, contextType: string): Promise<number> {
    // 这里可以根据会话历史评估上下文匹配度
    // 简化实现，返回基础分数
    return 0.5
  }

  // 评估时间条件
  private evaluateTimeCondition(timeCondition: any): number {
    const now = new Date()
    const hour = now.getHours()

    // 简单的时间条件评估
    if (timeCondition.type === 'hour_range') {
      const { start, end } = timeCondition
      if (hour >= start && hour <= end) {
        return 1.0
      }
    }

    return 0
  }

  // 执行人格切换
  async switchPersonality(request: PersonalitySwitchRequest): Promise<boolean> {
    try {
      const switchRecord: PersonalitySwitch = {
        id: `switch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        session_id: request.sessionId,
        from_personality: request.fromPersonality,
        to_personality: request.toPersonality,
        reason: request.reason,
        trigger_type: request.triggerType,
        emotion_context: request.emotion ? JSON.stringify(request.emotion) : null,
        created_at: new Date().toISOString()
      }

      const insertSwitch = this.db.prepare(`
        INSERT INTO personality_switches (
          id, session_id, from_personality, to_personality,
          reason, trigger_type, emotion_context, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      insertSwitch.run(
        switchRecord.id,
        switchRecord.session_id,
        switchRecord.from_personality,
        switchRecord.to_personality,
        switchRecord.reason,
        switchRecord.trigger_type,
        switchRecord.emotion_context,
        switchRecord.created_at
      )

      console.log(`Personality switched: ${request.fromPersonality} -> ${request.toPersonality}`)
      return true
    } catch (error) {
      console.error('Error switching personality:', error)
      return false
    }
  }

  // 获取人格切换历史
  async getPersonalitySwitchHistory(sessionId: string, limit: number = 20): Promise<PersonalitySwitch[]> {
    try {
      const getHistory = this.db.prepare(`
        SELECT * FROM personality_switches 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `)

      const switches = getHistory.all(sessionId, limit) as PersonalitySwitch[]
      return switches.map(switchRecord => ({
        ...switchRecord,
        emotion_context: switchRecord.emotion_context ? JSON.parse(switchRecord.emotion_context) : null
      }))
    } catch (error) {
      console.error('Error getting switch history:', error)
      return []
    }
  }

  // 获取人格使用统计
  async getPersonalityStats(sessionId?: string, days: number = 7) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      let whereClause = 'WHERE created_at >= ?'
      let params: any[] = [cutoffDate.toISOString()]

      if (sessionId) {
        whereClause += ' AND session_id = ?'
        params.push(sessionId)
      }

      // 人格使用分布
      const distributionQuery = this.db.prepare(`
        SELECT to_personality, COUNT(*) as count 
        FROM personality_switches ${whereClause}
        GROUP BY to_personality
      `)
      const distribution = distributionQuery.all(...params) as Array<{ to_personality: string; count: number }>

      // 切换频率
      const frequencyQuery = this.db.prepare(`
        SELECT COUNT(*) as total_switches 
        FROM personality_switches ${whereClause}
      `)
      const frequency = frequencyQuery.get(...params) as { total_switches: number }

      // 最常用的切换原因
      const reasonsQuery = this.db.prepare(`
        SELECT reason, COUNT(*) as count 
        FROM personality_switches ${whereClause}
        GROUP BY reason 
        ORDER BY count DESC 
        LIMIT 5
      `)
      const topReasons = reasonsQuery.all(...params) as Array<{ reason: string; count: number }>

      return {
        distribution,
        totalSwitches: frequency.total_switches,
        topReasons,
        period: `${days} days`
      }
    } catch (error) {
      console.error('Error getting personality stats:', error)
      return null
    }
  }

  // 检查是否需要切换人格
  async shouldSwitchPersonality(
    currentPersonality: string,
    emotion: any,
    content: string,
    sessionId: string
  ): Promise<{ shouldSwitch: boolean; recommendedPersonality?: string; reason?: string }> {
    const recommendations = await this.recommendPersonality(emotion, content, sessionId)
    
    if (recommendations.length === 0) {
      return { shouldSwitch: false }
    }

    const topRecommendation = recommendations[0]
    
    // 如果推荐的人格与当前人格不同，且分数足够高
    if (topRecommendation.personality !== currentPersonality && topRecommendation.score > 0.6) {
      return {
        shouldSwitch: true,
        recommendedPersonality: topRecommendation.personality,
        reason: topRecommendation.reasons.join('；')
      }
    }

    return { shouldSwitch: false }
  }

  // 获取人格描述
  getPersonalityDescription(personalityId: string): string {
    const personality = this.getPersonality(personalityId)
    return personality ? personality.description : '未知人格'
  }

  // 获取人格语音参数
  getPersonalityVoiceParams(personalityId: string): VoiceParams | null {
    const personality = this.getPersonality(personalityId)
    return personality ? personality.voiceParams : null
  }

  // 更新人格配置
  updatePersonality(personalityId: string, updates: Partial<PersonalityConfig>): boolean {
    if (!this.personalities[personalityId]) {
      return false
    }

    this.personalities[personalityId] = {
      ...this.personalities[personalityId],
      ...updates
    }

    return true
  }

  // 添加自定义人格
  addCustomPersonality(personality: PersonalityConfig): boolean {
    if (this.personalities[personality.id]) {
      return false // 人格已存在
    }

    this.personalities[personality.id] = personality
    return true
  }

  // 删除自定义人格
  removeCustomPersonality(personalityId: string): boolean {
    // 不允许删除预定义人格
    const predefinedIds = ['default', 'tsundere', 'tech', 'warm', 'defensive']
    if (predefinedIds.includes(personalityId)) {
      return false
    }

    if (this.personalities[personalityId]) {
      delete this.personalities[personalityId]
      return true
    }

    return false
  }

  // 导出人格配置
  exportPersonalities(): any {
    return {
      personalities: this.personalities,
      exportedAt: new Date().toISOString()
    }
  }

  // 导入人格配置
  importPersonalities(data: any): boolean {
    try {
      if (data.personalities) {
        // 只导入自定义人格，保留预定义人格
        const predefinedIds = ['default', 'tsundere', 'tech', 'warm', 'defensive']
        
        for (const [id, personality] of Object.entries(data.personalities)) {
          if (!predefinedIds.includes(id)) {
            this.personalities[id] = personality as PersonalityConfig
          }
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error importing personalities:', error)
      return false
    }
  }
}

export const personalityService = new PersonalityService()
export default personalityService