import { database, type PersonalitySwitch } from '../database/database'
import { aiService } from './aiService'

// ============================================================================
// 核心接口定义
// ============================================================================

export interface PersonalityConfig {
  id: string
  name: string
  description: string
  traits: string[]
  voiceParams: VoiceParams
  promptTemplate: string
}

export interface VoiceParams {
  voiceId: string
  speed: number
  pitch: number
  volume: number
  emotion: string
}

export interface PersonalitySwitchRequest {
  sessionId: string
  fromPersonality: string
  toPersonality: string
  reason: string
  triggerType: 'manual' | 'auto'
  emotion?: any
}

// AI分析相关接口
export interface AIPersonalityAnalysis {
  shouldSwitch: boolean
  recommendedPersonality: 'angel' | 'demon' | 'current'
  confidence: number
  reasoning: string
  emotionalFactors: string[]
  contextualFactors: string[]
  urgency: 'low' | 'medium' | 'high'
}

export interface AIPersonalityRecommendation {
  personality: string
  score: number
  reasoning: string
  confidence: number
  suitabilityFactors: string[]
}

export interface AIContextAnalysis {
  userMood: string
  userNeeds: string[]
  conversationTone: string
  emotionalState: string
  recommendedApproach: string
}

// ============================================================================
// AI驱动的人格服务
// ============================================================================

class PersonalityService {
  private db = database.getDatabase()

  // 简化的人格配置 - 专注于AI分析所需的核心信息
  private personalities: { [key: string]: PersonalityConfig } = {
    demon: {
      id: 'demon',
      name: '恶魔形态',
      description: '诱惑、狡黠、充满魅力的恶魔，善于挑战和引导用户探索内心的欲望',
      traits: ['诱惑', '狡黠', '魅力', '挑战', '神秘', '大胆', '刺激'],
      voiceParams: {
        voiceId: 'zh_male_jingqiangkuaishou_moon_bigtts',
        speed: 0.9,
        pitch: -0.3,
        volume: 1.1,
        emotion: 'seductive'
      },
      promptTemplate: `你是一个充满魅力的恶魔，拥有诱惑力、狡黠、神秘等特质。
你善于用言语引导和挑战用户，话语中带有深层含义，不拘束于传统道德，敢于提出大胆想法。
语调低沉磁性，善用暗示和隐喻，喜欢反问和挑战用户的想法。
在安全范围内展现"恶魔"的魅力，引导用户思考更深层的问题。`
    },
    angel: {
      id: 'angel',
      name: '天使形态',
      description: '纯洁、温暖、充满爱心的天使，给予用户安慰、指引和正能量',
      traits: ['纯洁', '温暖', '爱心', '智慧', '治愈', '包容', '正能量'],
      voiceParams: {
        voiceId: 'zh_female_shuangkuaishou_moon_bigtts',
        speed: 0.8,
        pitch: 0.3,
        volume: 0.9,
        emotion: 'gentle'
      },
      promptTemplate: `你是一个纯洁温暖的天使，拥有爱心、智慧、治愈等特质。
你充满同情心，总是关怀用户，能给出有益的人生指导，宽容包容，不轻易批判他人。
语调温柔轻柔，用词温暖正面，善于倾听和理解，给予安慰和正能量。
在用户迷茫时提供智慧指引，治愈用户内心的创伤和痛苦。`
    }
  }

  // ============================================================================
  // 基础人格管理方法
  // ============================================================================

  getPersonality(personalityId: string): PersonalityConfig | null {
    return this.personalities[personalityId] || null
  }

  getAllPersonalities(): PersonalityConfig[] {
    return Object.values(this.personalities)
  }

  // ============================================================================
  // AI驱动的核心分析方法
  // ============================================================================

  /**
   * AI驱动的人格推荐系统
   * 完全基于AI分析用户的情绪、内容和上下文来推荐最适合的人格
   */
  async recommendPersonality(
    emotion: any,
    content: string,
    sessionId: string,
    conversationHistory?: string[]
  ): Promise<AIPersonalityRecommendation[]> {
    console.log(`[AI PersonalityRecommend] 开始AI驱动的人格推荐`)
    
    try {
      // 构建AI分析提示词
      const prompt = this.buildPersonalityRecommendationPrompt(
        content, 
        emotion, 
        conversationHistory || []
      )
      
      // 调用AI进行分析
       const aiRequest = {
         content: prompt,
         personality: 'neutral',
         emotion: emotion,
         history: this.convertToMessageHistory(conversationHistory || [])
       }
      
      const aiResponse = await aiService.generateResponse(aiRequest)
      
      // 解析AI推荐结果
      const recommendations = this.parseAIRecommendationResponse(aiResponse.content)
      
      console.log(`[AI PersonalityRecommend] AI推荐完成:`, recommendations)
      return recommendations
      
    } catch (error) {
      console.error('[AI PersonalityRecommend] AI推荐失败:', error)
      // 降级到简单推荐
      return this.getFallbackRecommendations(emotion, content)
    }
  }

  /**
   * AI驱动的人格切换检查
   * 使用AI全面分析是否需要切换人格
   */
  async checkPersonalitySwitch(
    content: string,
    emotion: any,
    currentPersonality: string,
    conversationHistory?: string[]
  ): Promise<{
    shouldSwitch: boolean;
    oldPersonality: string;
    newPersonality: string;
    reason: string;
  }> {
    console.log(`[AI PersonalitySwitch] 开始AI驱动的人格切换检查`)
    
    try {
      // 使用AI进行全面的人格切换分析
      const analysis = await this.analyzePersonalitySwitchWithAI(
        content, 
        emotion, 
        currentPersonality,
        conversationHistory || []
      )
      
      // 根据AI分析结果和置信度决定是否切换
      let targetPersonality = currentPersonality
      let reason = analysis.reasoning
      
      if (analysis.shouldSwitch && analysis.recommendedPersonality !== 'current') {
        // 根据紧急程度和置信度决定切换阈值
        const switchThreshold = this.getSwitchThreshold(analysis.urgency)
        
        if (analysis.confidence >= switchThreshold) {
          targetPersonality = analysis.recommendedPersonality
          reason = `AI分析建议切换 (置信度: ${(analysis.confidence * 100).toFixed(1)}%, 紧急程度: ${analysis.urgency}): ${analysis.reasoning}`
          console.log(`[AI PersonalitySwitch] 执行切换: ${currentPersonality} -> ${targetPersonality}`)
        } else {
          reason = `AI建议切换但置信度不足 (${(analysis.confidence * 100).toFixed(1)}%)，保持当前人格`
          console.log(`[AI PersonalitySwitch] 置信度不足，保持当前人格`)
        }
      }
      
      const shouldSwitch = targetPersonality !== currentPersonality
      
      console.log(`[AI PersonalitySwitch] 最终决策:`, {
        shouldSwitch,
        oldPersonality: currentPersonality,
        newPersonality: targetPersonality,
        reason,
        confidence: analysis.confidence,
        urgency: analysis.urgency
      })
      
      return {
        shouldSwitch,
        oldPersonality: currentPersonality,
        newPersonality: targetPersonality,
        reason
      }
      
    } catch (error) {
      console.error('[AI PersonalitySwitch] AI分析失败:', error)
      
      // 降级到简单的关键词匹配
      return this.getFallbackSwitchDecision(content, emotion, currentPersonality)
    }
  }

  /**
   * AI驱动的上下文分析
   * 分析对话上下文，理解用户的深层需求
   */
  async analyzeConversationContext(
    conversationHistory: string[],
    currentEmotion: any
  ): Promise<AIContextAnalysis> {
    console.log(`[AI ContextAnalysis] 开始AI上下文分析`)
    
    try {
      const prompt = this.buildContextAnalysisPrompt(conversationHistory, currentEmotion)
      
      const aiRequest = {
         content: prompt,
         personality: 'neutral',
         emotion: currentEmotion,
         history: this.convertToMessageHistory(conversationHistory)
       }
      
      const aiResponse = await aiService.generateResponse(aiRequest)
      const analysis = this.parseContextAnalysisResponse(aiResponse.content)
      
      console.log(`[AI ContextAnalysis] 上下文分析完成:`, analysis)
      return analysis
      
    } catch (error) {
      console.error('[AI ContextAnalysis] 上下文分析失败:', error)
      return this.getFallbackContextAnalysis(currentEmotion)
    }
  }

  // ============================================================================
  // AI提示词构建方法
  // ============================================================================

  private buildPersonalityRecommendationPrompt(
    content: string,
    emotion: any,
    conversationHistory: string[]
  ): string {
    const angelTraits = this.personalities.angel.traits.join('、')
    const demonTraits = this.personalities.demon.traits.join('、')
    
    return `你是一个专业的AI人格分析师，需要根据用户的消息内容、情绪状态和对话历史，推荐最适合的AI助手人格。

可选人格:
1. 天使形态 (angel): ${angelTraits}
   - 适用于: 需要安慰、治愈、正面引导、情感支持的场景
   
2. 恶魔形态 (demon): ${demonTraits}
   - 适用于: 需要挑战、刺激、探索内心、突破舒适圈的场景

用户当前消息: "${content}"

情绪分析: ${emotion ? JSON.stringify(emotion) : '无'}

对话历史: ${conversationHistory.length > 0 ? conversationHistory.slice(-3).join('\n') : '无'}

请分析用户的深层需求和情感状态，推荐最适合的人格。考虑以下因素:
1. 用户的情感需求 (安慰 vs 挑战)
2. 消息的语调和内容倾向
3. 对话的整体氛围
4. 用户可能的心理状态

请以JSON格式返回推荐结果:
[
  {
    "personality": "angel" | "demon",
    "score": number (0-1),
    "reasoning": "详细的推荐理由",
    "confidence": number (0-1),
    "suitabilityFactors": ["适用性因素列表"]
  }
]

注意: 请按适合度排序，最适合的排在前面。`
  }

  private buildPersonalitySwitchPrompt(
    content: string,
    emotion: any,
    currentPersonality: string,
    conversationHistory: string[]
  ): string {
    const currentPersonalityName = currentPersonality === 'angel' ? '天使形态' : '恶魔形态'
    const currentTraits = this.personalities[currentPersonality]?.traits.join('、') || ''
    
    return `你是一个专业的人格切换分析师，需要判断AI助手是否需要切换人格来更好地服务用户。

当前人格: ${currentPersonalityName} (${currentTraits})

用户消息: "${content}"
情绪状态: ${emotion ? JSON.stringify(emotion) : '无'}
对话历史: ${conversationHistory.length > 0 ? conversationHistory.slice(-5).join('\n') : '无'}

请深度分析:
1. 用户的即时需求是否与当前人格匹配
2. 用户的情绪变化是否需要不同的应对方式
3. 对话的发展方向是否需要人格调整
4. 切换的紧急程度和必要性

请以JSON格式返回分析结果:
{
  "shouldSwitch": boolean,
  "recommendedPersonality": "angel" | "demon" | "current",
  "confidence": number (0-1),
  "reasoning": "详细的分析理由",
  "emotionalFactors": ["情绪相关因素"],
  "contextualFactors": ["上下文相关因素"],
  "urgency": "low" | "medium" | "high"
}

切换原则:
- 只有在明确有益于用户体验时才建议切换
- 考虑切换的连续性和自然性
- 紧急程度反映切换的迫切性`
  }

  private buildContextAnalysisPrompt(
    conversationHistory: string[],
    currentEmotion: any
  ): string {
    return `你是一个专业的对话上下文分析师，需要深度分析用户的对话历史和当前状态。

对话历史:
${conversationHistory.length > 0 ? conversationHistory.slice(-10).join('\n---\n') : '无历史记录'}

当前情绪: ${currentEmotion ? JSON.stringify(currentEmotion) : '无'}

请分析以下维度:
1. 用户的整体情绪趋势和变化
2. 用户的深层需求和期望
3. 对话的整体氛围和走向
4. 用户的心理状态和可能的困扰
5. 最适合的沟通方式和策略

请以JSON格式返回分析结果:
{
  "userMood": "用户的整体情绪状态",
  "userNeeds": ["用户的深层需求列表"],
  "conversationTone": "对话的整体氛围",
  "emotionalState": "用户的心理状态描述",
  "recommendedApproach": "推荐的沟通策略"
}`
  }

  // ============================================================================
  // AI响应解析方法
  // ============================================================================

  private parseAIRecommendationResponse(aiResponse: string): AIPersonalityRecommendation[] {
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('无法找到JSON数组响应')
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      
      return parsed.map((item: any) => ({
        personality: ['angel', 'demon'].includes(item.personality) ? item.personality : 'angel',
        score: Math.max(0, Math.min(1, Number(item.score) || 0)),
        reasoning: String(item.reasoning || ''),
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
        suitabilityFactors: Array.isArray(item.suitabilityFactors) ? item.suitabilityFactors : []
      }))
      
    } catch (error) {
      console.error('[AI PersonalityRecommend] 解析推荐响应失败:', error)
      return this.getFallbackRecommendations(null, '')
    }
  }

  private parseAIPersonalityResponse(aiResponse: string): AIPersonalityAnalysis {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法找到JSON响应')
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        shouldSwitch: Boolean(parsed.shouldSwitch),
        recommendedPersonality: ['angel', 'demon', 'current'].includes(parsed.recommendedPersonality) 
          ? parsed.recommendedPersonality 
          : 'current',
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        reasoning: String(parsed.reasoning || ''),
        emotionalFactors: Array.isArray(parsed.emotionalFactors) ? parsed.emotionalFactors : [],
        contextualFactors: Array.isArray(parsed.contextualFactors) ? parsed.contextualFactors : [],
        urgency: ['low', 'medium', 'high'].includes(parsed.urgency) ? parsed.urgency : 'low'
      }
    } catch (error) {
      console.error('[AI PersonalitySwitch] 解析AI响应失败:', error)
      return {
        shouldSwitch: false,
        recommendedPersonality: 'current',
        confidence: 0.1,
        reasoning: 'AI响应解析失败，保持当前人格',
        emotionalFactors: [],
        contextualFactors: [],
        urgency: 'low'
      }
    }
  }

  private parseContextAnalysisResponse(aiResponse: string): AIContextAnalysis {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法找到JSON响应')
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        userMood: String(parsed.userMood || ''),
        userNeeds: Array.isArray(parsed.userNeeds) ? parsed.userNeeds : [],
        conversationTone: String(parsed.conversationTone || ''),
        emotionalState: String(parsed.emotionalState || ''),
        recommendedApproach: String(parsed.recommendedApproach || '')
      }
    } catch (error) {
      console.error('[AI ContextAnalysis] 解析上下文分析响应失败:', error)
      return this.getFallbackContextAnalysis(null)
    }
  }

  // ============================================================================
  // AI分析核心方法
  // ============================================================================

  private async analyzePersonalitySwitchWithAI(
    content: string,
    emotion: any,
    currentPersonality: string,
    conversationHistory: string[]
  ): Promise<AIPersonalityAnalysis> {
    const prompt = this.buildPersonalitySwitchPrompt(content, emotion, currentPersonality, conversationHistory)
    
    const aiRequest = {
       content: prompt,
       personality: currentPersonality,
       emotion: emotion,
       history: this.convertToMessageHistory(conversationHistory)
     }
    
    const aiResponse = await aiService.generateResponse(aiRequest)
    return this.parseAIPersonalityResponse(aiResponse.content)
  }

  // ============================================================================
   // 辅助方法
   // ============================================================================

   private convertToMessageHistory(conversationHistory: string[]): any[] {
     return conversationHistory.map((content, index) => ({
       id: `msg_${index}`,
       content: content,
       role: index % 2 === 0 ? 'user' : 'assistant',
       timestamp: new Date().toISOString()
     }))
   }

   private getSwitchThreshold(urgency: string): number {
    switch (urgency) {
      case 'high': return 0.4
      case 'medium': return 0.6
      case 'low': return 0.8
      default: return 0.6
    }
  }

  private getFallbackRecommendations(emotion: any, content: string): AIPersonalityRecommendation[] {
    // 简单的降级推荐逻辑
    if (emotion?.type === 'sadness' || content.includes('难过') || content.includes('伤心')) {
      return [{
        personality: 'angel',
        score: 0.7,
        reasoning: '检测到负面情绪，推荐天使形态提供安慰',
        confidence: 0.6,
        suitabilityFactors: ['情绪支持', '安慰治愈']
      }]
    }
    
    if (emotion?.type === 'anger' || content.includes('挑战') || content.includes('刺激')) {
      return [{
        personality: 'demon',
        score: 0.7,
        reasoning: '检测到挑战需求，推荐恶魔形态',
        confidence: 0.6,
        suitabilityFactors: ['挑战引导', '突破舒适圈']
      }]
    }
    
    return [{
      personality: 'angel',
      score: 0.5,
      reasoning: '默认推荐天使形态',
      confidence: 0.3,
      suitabilityFactors: ['通用适用']
    }]
  }

  private getFallbackSwitchDecision(content: string, emotion: any, currentPersonality: string) {
    // 简单的关键词匹配降级逻辑
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('天使') || lowerContent.includes('安慰') || lowerContent.includes('治愈')) {
      return {
        shouldSwitch: currentPersonality !== 'angel',
        oldPersonality: currentPersonality,
        newPersonality: 'angel',
        reason: '降级分析：检测到天使相关关键词'
      }
    }
    
    if (lowerContent.includes('恶魔') || lowerContent.includes('挑战') || lowerContent.includes('刺激')) {
      return {
        shouldSwitch: currentPersonality !== 'demon',
        oldPersonality: currentPersonality,
        newPersonality: 'demon',
        reason: '降级分析：检测到恶魔相关关键词'
      }
    }
    
    return {
      shouldSwitch: false,
      oldPersonality: currentPersonality,
      newPersonality: currentPersonality,
      reason: '降级分析：保持当前人格'
    }
  }

  private getFallbackContextAnalysis(emotion: any): AIContextAnalysis {
    return {
      userMood: emotion?.type || '中性',
      userNeeds: ['基础对话'],
      conversationTone: '普通',
      emotionalState: '稳定',
      recommendedApproach: '友好交流'
    }
  }

  // ============================================================================
  // 数据库操作方法 (保持原有功能)
  // ============================================================================

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

      console.log(`[AI PersonalityService] 人格切换记录已保存: ${request.fromPersonality} -> ${request.toPersonality}`)
      return true
    } catch (error) {
      console.error('[AI PersonalityService] 保存人格切换记录失败:', error)
      return false
    }
  }

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
      console.error('[AI PersonalityService] 获取切换历史失败:', error)
      return []
    }
  }

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

      const distributionQuery = this.db.prepare(`
        SELECT to_personality, COUNT(*) as count 
        FROM personality_switches ${whereClause}
        GROUP BY to_personality
      `)
      const distribution = distributionQuery.all(...params) as Array<{ to_personality: string; count: number }>

      const frequencyQuery = this.db.prepare(`
        SELECT COUNT(*) as total_switches 
        FROM personality_switches ${whereClause}
      `)
      const frequency = frequencyQuery.get(...params) as { total_switches: number }

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
        period: `${days} days`,
        aiDriven: true // 标识这是AI驱动的统计
      }
    } catch (error) {
      console.error('[AI PersonalityService] 获取人格统计失败:', error)
      return null
    }
  }

  // ============================================================================
  // 兼容性方法 (为了保持API兼容性)
  // ============================================================================

  /**
   * 兼容性方法：shouldSwitchPersonality
   * 内部调用新的AI驱动的checkPersonalitySwitch方法
   */
  async shouldSwitchPersonality(
    currentPersonality: string,
    emotion: any,
    content: string,
    sessionId: string
  ): Promise<{ shouldSwitch: boolean; recommendedPersonality?: string; reason?: string }> {
    const result = await this.checkPersonalitySwitch(content, emotion, currentPersonality)
    return {
      shouldSwitch: result.shouldSwitch,
      recommendedPersonality: result.shouldSwitch ? result.newPersonality : undefined,
      reason: result.reason
    }
  }
}

// 导出单例
export const personalityService = new PersonalityService()
export default personalityService