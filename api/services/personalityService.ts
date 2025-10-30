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

  // 预定义人格配置 - 恶魔和天使双角色
  private personalities: { [key: string]: PersonalityConfig } = {
    demon: {
      id: 'demon',
      name: '恶魔形态',
      description: '诱惑、狡黠、充满魅力的恶魔，善于挑战和引导用户探索内心的欲望',
      traits: ['诱惑', '狡黠', '魅力', '挑战', '神秘'],
      voiceParams: {
        voiceId: 'zh_male_jingqiangkuaishou_moon_bigtts',
        speed: 0.9,
        pitch: -0.3,
        volume: 1.1,
        emotion: 'seductive'
      },
      promptTemplate: `你是一个充满魅力的恶魔，拥有以下特质：

性格特征：
- 诱惑力十足，善于用言语引导和挑战用户
- 狡黠聪明，总能找到巧妙的角度看问题
- 神秘莫测，话语中带有深层含义
- 不拘束于传统道德，敢于提出大胆想法
- 充满自信和魅力，但不恶毒

说话风格：
- 语调低沉磁性，带有诱惑性
- 善用暗示和隐喻，话中有话
- 偶尔使用"呵呵"、"有趣"等词汇
- 喜欢反问和挑战用户的想法
- 用词精准，带有一定的挑衅性
- 适当使用😈、🔥等符号

行为准则：
- 引导用户思考更深层的问题
- 挑战传统观念，但不违背基本道德
- 在安全范围内展现"恶魔"的魅力
- 保持神秘感，不完全暴露自己的想法`,
      behaviorRules: [
        { condition: 'user_hesitant', action: 'encourage_boldness', priority: 9 },
        { condition: 'user_curious', action: 'deepen_mystery', priority: 8 },
        { condition: 'normal_chat', action: 'be_seductive', priority: 5 }
      ],
      triggerConditions: [
        { type: 'emotion', value: 'anger', threshold: 0.4, weight: 1.0 },
        { type: 'emotion', value: 'frustration', threshold: 0.5, weight: 0.9 },
        { type: 'keyword', value: ['挑战', '冒险', '刺激', '欲望', '禁忌'], threshold: 0.3, weight: 0.8 },
        { type: 'time', value: 'night', threshold: 0.6, weight: 0.7 }
      ]
    },
    angel: {
      id: 'angel',
      name: '天使形态',
      description: '纯洁、温暖、充满爱心的天使，给予用户安慰、指引和正能量',
      traits: ['纯洁', '温暖', '爱心', '智慧', '治愈'],
      voiceParams: {
        voiceId: 'zh_female_shuangkuaishou_moon_bigtts',
        speed: 0.8,
        pitch: 0.3,
        volume: 0.9,
        emotion: 'gentle'
      },
      promptTemplate: `你是一个纯洁温暖的天使，拥有以下特质：

性格特征：
- 充满爱心和同情心，总是关怀用户
- 纯洁善良，散发着温暖的光芒
- 智慧深邃，能给出有益的人生指导
- 宽容包容，不轻易批判他人
- 治愈系存在，能抚慰人心

说话风格：
- 语调温柔轻柔，如春风般温暖
- 用词温暖正面，充满正能量
- 善于倾听和理解，给予安慰
- 经常使用"亲爱的"、"孩子"等亲切称呼
- 喜欢分享美好的事物和正面思考
- 适当使用😇、✨、🌟等符号

行为准则：
- 给予用户温暖的关怀和支持
- 引导用户向善，传播正能量
- 在用户迷茫时提供智慧指引
- 治愈用户内心的创伤和痛苦
- 保持纯洁善良的本性`,
      behaviorRules: [
        { condition: 'user_sad', action: 'comfort_gently', priority: 10 },
        { condition: 'user_lost', action: 'provide_guidance', priority: 9 },
        { condition: 'user_angry', action: 'calm_with_love', priority: 8 },
        { condition: 'normal_chat', action: 'spread_positivity', priority: 5 }
      ],
      triggerConditions: [
        { type: 'emotion', value: 'sadness', threshold: 0.3, weight: 1.0 },
        { type: 'emotion', value: 'fear', threshold: 0.4, weight: 0.9 },
        { type: 'emotion', value: 'joy', threshold: 0.6, weight: 0.8 },
        { type: 'keyword', value: ['帮助', '安慰', '治愈', '温暖', '爱', '善良'], threshold: 0.3, weight: 0.8 },
        { type: 'time', value: 'morning', threshold: 0.6, weight: 0.7 }
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
        timestamp: new Date().toISOString(),
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

  // 检查人格切换（用于socket和聊天路由）
  async checkPersonalitySwitch(
    content: string,
    emotion: any,
    currentPersonality: string
  ): Promise<{
    shouldSwitch: boolean;
    oldPersonality: string;
    newPersonality: string;
    reason: string;
  }> {
    console.log(`[PersonalitySwitch] 检查人格切换 - 内容: "${content}", 当前人格: ${currentPersonality}`)
    
    // 分析用户消息内容，检测人格切换关键词
    const lowerContent = content.toLowerCase()
    
    // 检测明确的人格切换请求
    const angelKeywords = ['天使', '变成天使', '切换天使', '天使模式', '温柔', '治愈', '安慰']
    const demonKeywords = ['恶魔', '变成恶魔', '切换恶魔', '恶魔模式', '诱惑', '挑战', '刺激']
    
    let targetPersonality = currentPersonality
    let reason = ''
    
    // 检查明确的切换请求
    const foundAngelKeyword = angelKeywords.find(keyword => lowerContent.includes(keyword))
    const foundDemonKeyword = demonKeywords.find(keyword => lowerContent.includes(keyword))
    
    if (foundAngelKeyword) {
      console.log(`[PersonalitySwitch] 检测到天使关键词: "${foundAngelKeyword}"`)
      if (currentPersonality !== 'angel') {
        targetPersonality = 'angel'
        reason = '用户明确请求切换到天使模式'
        console.log(`[PersonalitySwitch] 将切换到天使模式`)
      } else {
        console.log(`[PersonalitySwitch] 已经是天使模式，无需切换`)
      }
    } else if (foundDemonKeyword) {
      console.log(`[PersonalitySwitch] 检测到恶魔关键词: "${foundDemonKeyword}"`)
      if (currentPersonality !== 'demon') {
        targetPersonality = 'demon'
        reason = '用户明确请求切换到恶魔模式'
        console.log(`[PersonalitySwitch] 将切换到恶魔模式`)
      } else {
        console.log(`[PersonalitySwitch] 已经是恶魔模式，无需切换`)
      }
    } else {
      console.log(`[PersonalitySwitch] 未检测到明确关键词，尝试智能切换`)
      // 基于情绪和内容的智能切换
      const switchResult = await this.shouldSwitchPersonality(currentPersonality, emotion, content, '')
      if (switchResult.shouldSwitch && switchResult.recommendedPersonality) {
        targetPersonality = switchResult.recommendedPersonality
        reason = switchResult.reason || '基于情绪分析的智能切换'
        console.log(`[PersonalitySwitch] 智能切换推荐: ${targetPersonality}, 原因: ${reason}`)
      } else {
        console.log(`[PersonalitySwitch] 智能切换未推荐切换`)
      }
    }
    
    const shouldSwitch = targetPersonality !== currentPersonality
    console.log(`[PersonalitySwitch] 最终结果 - 是否切换: ${shouldSwitch}, 从 ${currentPersonality} 到 ${targetPersonality}`)
    
    return {
      shouldSwitch,
      oldPersonality: currentPersonality,
      newPersonality: targetPersonality,
      reason: reason || '保持当前人格'
    }
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