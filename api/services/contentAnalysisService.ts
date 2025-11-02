import { aiService } from './aiService'
import { memoryService } from './memoryService'
import { personalityService } from './personalityService'
import { emotionService } from './emotionService'
import { affinityService } from './affinityService'

export interface ContentAnalysisRequest {
  content: string
  sessionId: string
  currentPersonality: string
  conversationHistory: any[]
  userId?: number
}

export interface ContentAnalysisResult {
  // 情绪分析结果
  emotion: {
    type: string
    intensity: number
    description: string
  }
  
  // 人格切换分析
  personalityAnalysis: {
    shouldSwitch: boolean
    newPersonality?: string
    reason?: string
    confidence: number
  }
  
  // 记忆解锁分析
  memoryAnalysis: {
    triggeredKeywords: string[]
    emotionalTriggers: string[]
    contextualClues: string[]
    unlockCandidates: string[]
    confidence: number
  }
  
  // 好感度分析
  affinityAnalysis: {
    choiceType: 'angel' | 'demon' | 'neutral'
    reasoning: string
    impactLevel: number
  }
  
  // 综合分析
  overallAnalysis: {
    userIntent: string
    conversationDirection: string
    recommendedResponse: string
  }
}

class ContentAnalysisService {
  
  /**
   * 统一分析用户输入内容
   * 使用单一LLM调用进行全面分析
   */
  async analyzeContent(request: ContentAnalysisRequest): Promise<ContentAnalysisResult> {
    try {
      // 获取当前会话的统计信息
      const sessionStats = await this.getSessionStats(request.sessionId)
      
      // 获取所有未解锁的记忆片段
      const allMemories = await memoryService.getMemoryFragments({ 
        sessionId: request.sessionId, 
        unlocked: false 
      })
      
      // 构建分析提示词
      const analysisPrompt = this.buildAnalysisPrompt(
        request,
        sessionStats,
        allMemories
      )
      
      // 调用LLM进行统一分析 (使用现有的generateResponse方法)
      const llmResponse = await aiService.generateResponse({
        content: analysisPrompt,
        personality: 'analyst',
        emotion: { type: 'neutral', intensity: 0.5 },
        history: []
      })
      
      // 解析LLM返回的分析结果
      const analysisResult = this.parseLLMResponse(llmResponse.content)
      
      // 验证和补充分析结果
      const validatedResult = await this.validateAndEnhanceResult(
        analysisResult,
        request
      )
      
      return validatedResult
      
    } catch (error) {
      console.error('Content analysis failed:', error)
      return this.getFallbackAnalysis(request)
    }
  }
  
  /**
   * 构建统一分析的提示词
   */
  private buildAnalysisPrompt(
    request: ContentAnalysisRequest,
    sessionStats: any,
    lockedMemories: any[]
  ): string {
    return `
请对以下用户输入进行全面分析，并以JSON格式返回分析结果：

## 用户输入
内容: "${request.content}"
当前人格: ${request.currentPersonality}
会话ID: ${request.sessionId}

## 会话上下文
对话次数: ${sessionStats.messageCount}
历史情绪: ${JSON.stringify(sessionStats.emotionHistory)}
已解锁记忆: ${sessionStats.unlockedMemories}

## 可解锁的记忆片段
${lockedMemories.map(m => `- ${m.id}: ${m.title} (解锁条件: ${m.unlock_conditions})`).join('\n')}

## 分析要求
请分析以下方面并返回JSON格式结果：

1. **情绪分析** (emotion)
   - type: 主要情绪类型
   - intensity: 强度 (0-1)
   - description: 情绪描述

2. **人格切换分析** (personalityAnalysis)
   - shouldSwitch: 是否需要切换人格
   - newPersonality: 新人格类型 (如需切换)
   - reason: 切换原因
   - confidence: 置信度 (0-1)

3. **记忆解锁分析** (memoryAnalysis)
   - triggeredKeywords: 触发的关键词
   - emotionalTriggers: 情绪触发器
   - contextualClues: 上下文线索
   - unlockCandidates: 建议解锁的记忆ID列表
   - confidence: 置信度 (0-1)

4. **好感度分析** (affinityAnalysis)
   - choiceType: 选择类型 ('angel'/'demon'/'neutral')
   - reasoning: 判断理由
   - impactLevel: 影响程度 (1-5)

5. **综合分析** (overallAnalysis)
   - userIntent: 用户意图
   - conversationDirection: 对话走向
   - recommendedResponse: 推荐回应策略

请确保返回有效的JSON格式，不要包含其他文本。
`
  }
  
  /**
   * 解析LLM返回的分析结果
   */
  private parseLLMResponse(llmResponse: string): ContentAnalysisResult {
    try {
      // 尝试解析JSON
      const parsed = JSON.parse(llmResponse)
      
      // 验证必要字段
      if (!parsed.emotion || !parsed.personalityAnalysis || !parsed.memoryAnalysis) {
        throw new Error('Missing required analysis fields')
      }
      
      return parsed as ContentAnalysisResult
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error)
      throw new Error('Invalid LLM response format')
    }
  }
  
  /**
   * 验证和增强分析结果
   */
  private async validateAndEnhanceResult(
    result: ContentAnalysisResult,
    request: ContentAnalysisRequest
  ): Promise<ContentAnalysisResult> {
    
    // 验证记忆解锁候选
    if (result.memoryAnalysis.unlockCandidates.length > 0) {
      const validCandidates = await this.validateMemoryUnlockCandidates(
        result.memoryAnalysis.unlockCandidates,
        request.sessionId
      )
      result.memoryAnalysis.unlockCandidates = validCandidates
    }
    
    // 验证人格切换 (简化验证逻辑)
    if (result.personalityAnalysis.shouldSwitch) {
      const validPersonalities = ['default', 'tsundere', 'tech', 'warm', 'defensive']
      if (!validPersonalities.includes(result.personalityAnalysis.newPersonality || '')) {
        result.personalityAnalysis.shouldSwitch = false
        result.personalityAnalysis.newPersonality = undefined
      }
    }
    
    return result
  }
  
  /**
   * 验证记忆解锁候选
   */
  private async validateMemoryUnlockCandidates(
    candidates: string[],
    sessionId: string
  ): Promise<string[]> {
    const validCandidates: string[] = []
    
    // 获取所有记忆片段
    const allMemories = await memoryService.getAllMemoryFragments()
    const validIds = allMemories.map(m => m.id)
    
    for (const candidateId of candidates) {
      // 检查ID是否存在
      if (validIds.includes(candidateId)) {
        validCandidates.push(candidateId)
      }
    }
    
    return validCandidates
  }
  
  /**
   * 获取会话统计信息
   */
  private async getSessionStats(sessionId: string) {
    // 这里应该调用chatService的getSessionStats方法
    // 暂时返回模拟数据
    return {
      messageCount: 0,
      emotionHistory: [],
      unlockedMemories: 0
    }
  }
  
  /**
   * 分析好感度影响
   */
  private analyzeAffinity(content: string, emotion: any): {
    choiceType: 'angel' | 'demon' | 'neutral'
    reasoning: string
    impactLevel: number
  } {
    const lowerContent = content.toLowerCase()
    
    // 恶魔倾向关键词
    const demonKeywords = [
      '报复', '仇恨', '愤怒', '破坏', '伤害', '欺骗', '背叛', '诱惑', '堕落', '黑暗',
      '复仇', '恶意', '残忍', '冷酷', '自私', '贪婪', '嫉妒', '傲慢', '暴力', '邪恶',
      '操控', '利用', '欺压', '威胁', '恐吓', '折磨', '痛苦', '绝望', '毁灭', '腐败'
    ]
    
    // 天使倾向关键词
    const angelKeywords = [
      '宽恕', '原谅', '理解', '帮助', '关爱', '善良', '温柔', '慈悲', '救赎', '光明',
      '希望', '治愈', '安慰', '支持', '鼓励', '保护', '奉献', '牺牲', '无私', '纯洁',
      '正义', '诚实', '真诚', '友善', '包容', '耐心', '谦逊', '感恩', '祝福', '和平'
    ]
    
    let demonScore = 0
    let angelScore = 0
    const triggeredKeywords: string[] = []
    
    // 检查关键词
    demonKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        demonScore += 1
        triggeredKeywords.push(`恶魔:${keyword}`)
      }
    })
    
    angelKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        angelScore += 1
        triggeredKeywords.push(`天使:${keyword}`)
      }
    })
    
    // 基于情绪分析结果调整分数
    if (emotion && emotion.type) {
      const emotionType = emotion.type.toLowerCase()
      
      // 负面情绪倾向恶魔
      if (['anger', 'hatred', 'rage', 'fury', 'contempt', 'disgust', 'envy', 'jealousy'].includes(emotionType)) {
        demonScore += 2
        triggeredKeywords.push(`情绪:${emotion.type}(恶魔倾向)`)
      }
      
      // 正面情绪倾向天使
      if (['love', 'compassion', 'kindness', 'joy', 'peace', 'hope', 'gratitude', 'forgiveness'].includes(emotionType)) {
        angelScore += 2
        triggeredKeywords.push(`情绪:${emotion.type}(天使倾向)`)
      }
    }
    
    // 判断选择类型和生成推理
    let choiceType: 'angel' | 'demon' | 'neutral' = 'neutral'
    let reasoning = '中性选择，未检测到明显的道德倾向'
    
    if (demonScore > angelScore && demonScore > 0) {
      choiceType = 'demon'
      reasoning = `恶魔倾向 (分数: ${demonScore} vs ${angelScore})，触发关键词: ${triggeredKeywords.filter(k => k.includes('恶魔') || k.includes('恶魔倾向')).join(', ')}`
    } else if (angelScore > demonScore && angelScore > 0) {
      choiceType = 'angel'
      reasoning = `天使倾向 (分数: ${angelScore} vs ${demonScore})，触发关键词: ${triggeredKeywords.filter(k => k.includes('天使') || k.includes('天使倾向')).join(', ')}`
    }
    
    const impactLevel = Math.max(demonScore, angelScore) + 1
    
    return {
      choiceType,
      reasoning,
      impactLevel
    }
  }
  
  /**
   * 获取备用分析结果
   */
  private getFallbackAnalysis(request: ContentAnalysisRequest): ContentAnalysisResult {
    return {
      emotion: {
        type: 'neutral',
        intensity: 0.5,
        description: '中性情绪'
      },
      personalityAnalysis: {
        shouldSwitch: false,
        confidence: 0.1
      },
      memoryAnalysis: {
        triggeredKeywords: [],
        emotionalTriggers: [],
        contextualClues: [],
        unlockCandidates: [],
        confidence: 0.1
      },
      affinityAnalysis: {
        choiceType: 'neutral',
        reasoning: '无法分析',
        impactLevel: 1
      },
      overallAnalysis: {
        userIntent: '未知',
        conversationDirection: '继续对话',
        recommendedResponse: '继续当前对话'
      }
    }
  }
}

export const contentAnalysisService = new ContentAnalysisService()
export default contentAnalysisService