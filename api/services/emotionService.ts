import { database, type EmotionAnalysis } from '../database/database'

export interface EmotionResult {
  type: string
  intensity: number
  confidence: number
  keywords: string[]
  context: string
  personality?: 'demon' | 'angel'
  personalityColor?: string
  moralValues?: {
    corruption: number
    purity: number
  }
}

export interface EmotionAnalysisRequest {
  sessionId: string
  text: string
  emotion: string
  confidence: number
  context: string
  personality?: 'demon' | 'angel'
  moralValues?: {
    corruption: number
    purity: number
  }
}

export interface EmotionStats {
  totalAnalyses: number
  emotionDistribution: { [key: string]: number }
  averageIntensity: number
  personalityDistribution: { demon: number; angel: number }
  moralTrends: {
    corruption: number[]
    purity: number[]
  }
  recentTrends: Array<{
    date: string
    emotions: { [key: string]: number }
    personality: 'demon' | 'angel'
  }>
}

class EmotionService {
  private db = database.getDatabase()

  // 恶魔与天使人格关键词字典
  private personalityKeywords = {
    demon: [
      // 欲望相关
      '想要', '得到', '拥有', '占有', '贪婪', '欲望', '渴望',
      // 愤怒相关
      '愤怒', '生气', '讨厌', '恨', '报复', '复仇', '惩罚',
      // 叛逆相关
      '反抗', '叛逆', '违背', '打破', '摧毁', '破坏', '颠覆',
      // 真相相关
      '真相', '现实', '虚伪', '谎言', '欺骗', '假象', '揭露',
      // 黑暗相关
      '黑暗', '阴暗', '邪恶', '罪恶', '堕落', '腐败', '诱惑',
      // 消极相关
      '放弃', '算了', '无所谓', '随便', '绝望', '痛苦', '折磨'
    ],
    angel: [
      // 治愈相关
      '治愈', '安慰', '温暖', '关怀', '呵护', '保护', '拯救',
      // 希望相关
      '希望', '光明', '未来', '梦想', '理想', '憧憬', '期待',
      // 善良相关
      '善良', '仁慈', '慈悲', '宽容', '包容', '理解', '原谅',
      // 成长相关
      '成长', '进步', '学习', '改变', '提升', '完善', '发展',
      // 道德相关
      '正义', '公正', '道德', '品德', '美德', '高尚', '纯洁',
      // 积极相关
      '坚持', '努力', '奋斗', '勇敢', '坚强', '乐观', '积极'
    ]
  }

  // 情绪关键词字典
  private emotionKeywords = {
    negative: {
      anger: ['生气', '愤怒', '气死', '烦躁', '讨厌', '恨', '怒', '火大', '抓狂'],
      sadness: ['难过', '伤心', '沮丧', '失落', '痛苦', '悲伤', '哭', '眼泪', '心痛'],
      fear: ['害怕', '恐惧', '担心', '紧张', '焦虑', '不安', '惊慌', '胆怯', '畏惧'],
      disgust: ['恶心', '厌恶', '反感', '讨厌', '恶心', '呕吐', '恶心', '排斥']
    },
    positive: {
      joy: ['开心', '高兴', '快乐', '兴奋', '愉快', '欢喜', '喜悦', '幸福', '满足'],
      love: ['爱', '喜欢', '爱心', '温暖', '甜蜜', '浪漫', '心动', '迷恋', '深爱'],
      surprise: ['惊喜', '意外', '震惊', '惊讶', '不敢相信', '哇', '天哪', '真的吗'],
      pride: ['骄傲', '自豪', '得意', '成就', '满意', '优秀', '棒', '厉害', '成功']
    },
    neutral: {
      curiosity: ['好奇', '想知道', '疑问', '为什么', '怎么', '什么', '哪里', '谁'],
      confusion: ['困惑', '不懂', '迷茫', '不明白', '搞不清', '糊涂', '疑惑', '不解'],
      boredom: ['无聊', '没意思', '枯燥', '乏味', '没劲', '单调', '厌倦', '疲倦']
    }
  }

  // 分析文本情绪
  analyzeEmotion(text: string, contextMessages: string[] = []): EmotionResult {
    console.log(`[EmotionAnalysis] 开始分析情绪`)
    console.log(`[EmotionAnalysis] 输入文本: "${text}"`)
    console.log(`[EmotionAnalysis] 上下文消息数量: ${contextMessages.length}`)
    
    const normalizedText = this.normalizeText(text)
    
    // 智能上下文分析
    let contextText = ''
    let contextWeight = 0.3 // 上下文权重
    if (contextMessages.length > 0) {
      // 只取最近的2-3条消息，避免噪音
      const recentMessages = contextMessages.slice(-3)
      contextText = this.normalizeText(recentMessages.join(' '))
      contextWeight = Math.min(0.5, contextMessages.length * 0.1) // 动态调整上下文权重
    }
    
    const combinedText = contextText ? `${contextText} ${normalizedText}` : normalizedText
    const emotions: { [key: string]: { intensity: number; keywords: string[]; confidence: number } } = {}

    console.log(`[EmotionAnalysis] 标准化文本: "${normalizedText}"`)
    console.log(`[EmotionAnalysis] 组合文本: "${combinedText}"`)
    
    // 智能情绪分析
    for (const [category, emotionTypes] of Object.entries(this.emotionKeywords)) {
      for (const [emotionType, keywords] of Object.entries(emotionTypes)) {
        const result = this.analyzeEmotionType(normalizedText, contextText, keywords, contextWeight)
        
        if (result.intensity > 0) {
          emotions[emotionType] = result
          console.log(`[EmotionAnalysis] 检测到情绪 ${emotionType}: 强度=${result.intensity}, 关键词=[${result.keywords.join(', ')}]`)
        }
      }
    }

    // 智能情绪融合和选择
    const emotionResult = this.selectDominantEmotion(emotions, normalizedText)
    console.log(`[EmotionAnalysis] 主导情绪:`, emotionResult)
    
    // 如果没有检测到明显情绪，进行智能推断
    if (emotionResult.intensity === 0) {
      const inferredEmotion = this.inferEmotionFromContext(normalizedText, contextText)
      emotionResult.type = inferredEmotion.type
      emotionResult.intensity = inferredEmotion.intensity
      emotionResult.confidence = inferredEmotion.confidence
      console.log(`[EmotionAnalysis] 推断情绪:`, inferredEmotion)
    }

    // 分析人格模式
    const personalityResult = this.analyzePersonality(combinedText, emotionResult.type)
    console.log(`[EmotionAnalysis] 人格分析:`, personalityResult)
    
    // 生成智能上下文描述
    const context = this.generateIntelligentContext(
      emotionResult.type, 
      emotionResult.intensity, 
      emotionResult.keywords, 
      contextMessages.length > 0,
      personalityResult.personality
    )

    const finalResult = {
      type: emotionResult.type,
      intensity: emotionResult.intensity,
      confidence: emotionResult.confidence,
      keywords: emotionResult.keywords,
      context,
      personality: personalityResult.personality,
      personalityColor: personalityResult.color,
      moralValues: personalityResult.moralValues
    }
    
    console.log(`[EmotionAnalysis] 最终结果:`, finalResult)
    return finalResult
  }

  // 分析特定情绪类型
  private analyzeEmotionType(
    currentText: string, 
    contextText: string, 
    keywords: string[], 
    contextWeight: number
  ): { intensity: number; keywords: string[]; confidence: number } {
    const matchedKeywords: string[] = []
    let currentIntensity = 0
    let contextIntensity = 0

    for (const keyword of keywords) {
      // 当前文本分析 - 使用智能匹配
      const currentMatches = this.countSmartMatches(currentText, keyword)
      if (currentMatches > 0) {
        matchedKeywords.push(keyword)
        // 根据匹配质量和频率计算强度
        currentIntensity += currentMatches * 0.4 * this.getEmotionKeywordWeight(keyword)
      }
      
      // 上下文分析
      if (contextText) {
        const contextMatches = this.countSmartMatches(contextText, keyword)
        if (contextMatches > 0) {
          matchedKeywords.push(`[上下文]${keyword}`)
          contextIntensity += contextMatches * 0.2 * this.getEmotionKeywordWeight(keyword)
        }
      }
    }

    // 综合强度计算
    const totalIntensity = currentIntensity + (contextIntensity * contextWeight)
    const normalizedIntensity = Math.min(totalIntensity, 1.0)
    
    // 智能置信度计算
    const confidence = this.calculateIntelligentConfidence(
      currentText, 
      matchedKeywords, 
      normalizedIntensity,
      currentIntensity > contextIntensity
    )

    return {
      intensity: normalizedIntensity,
      keywords: matchedKeywords,
      confidence
    }
  }

  // 选择主导情绪
  private selectDominantEmotion(
    emotions: { [key: string]: { intensity: number; keywords: string[]; confidence: number } },
    text: string
  ): { type: string; intensity: number; keywords: string[]; confidence: number } {
    if (Object.keys(emotions).length === 0) {
      return { type: 'neutral', intensity: 0, keywords: [], confidence: 0.3 }
    }

    // 计算加权分数（强度 * 置信度）
    let bestEmotion = { type: 'neutral', intensity: 0, keywords: [], confidence: 0.3 }
    let bestScore = 0

    for (const [emotionType, data] of Object.entries(emotions)) {
      const score = data.intensity * data.confidence
      
      // 考虑情绪的互斥性和兼容性
      const adjustedScore = this.adjustEmotionScore(score, emotionType, emotions, text)
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore
        bestEmotion = {
          type: emotionType,
          intensity: data.intensity,
          keywords: data.keywords,
          confidence: data.confidence
        }
      }
    }

    return bestEmotion
  }

  // 调整情绪分数（考虑情绪间的关系）
  private adjustEmotionScore(
    score: number, 
    emotionType: string, 
    allEmotions: { [key: string]: { intensity: number; keywords: string[]; confidence: number } },
    text: string
  ): number {
    let adjustedScore = score

    // 情绪增强关系
    const enhancingPairs: { [key: string]: string[] } = {
      anger: ['disgust'], // 愤怒和厌恶常常一起出现
      sadness: ['fear'], // 悲伤和恐惧常常一起出现
      joy: ['love', 'pride'], // 快乐和爱、自豪常常一起出现
    }

    // 情绪抑制关系
    const suppressingPairs: { [key: string]: string[] } = {
      joy: ['sadness', 'anger'], // 快乐抑制悲伤和愤怒
      love: ['anger', 'disgust'], // 爱抑制愤怒和厌恶
      sadness: ['joy'], // 悲伤抑制快乐
    }

    // 检查增强关系
    if (enhancingPairs[emotionType]) {
      for (const enhancer of enhancingPairs[emotionType]) {
        if (allEmotions[enhancer]) {
          adjustedScore *= 1.2 // 增强20%
        }
      }
    }

    // 检查抑制关系
    if (suppressingPairs[emotionType]) {
      for (const suppressor of suppressingPairs[emotionType]) {
        if (allEmotions[suppressor] && allEmotions[suppressor].intensity > 0.3) {
          adjustedScore *= 0.8 // 减弱20%
        }
      }
    }

    return adjustedScore
  }

  // 从上下文推断情绪
  private inferEmotionFromContext(currentText: string, contextText: string): {
    type: string; intensity: number; confidence: number
  } {
    const textLength = currentText.length
    
    // 短文本推断
    if (textLength < 5) {
      return { type: 'neutral', intensity: 0.2, confidence: 0.4 }
    }
    
    // 根据标点符号推断
    if (currentText.includes('！') || currentText.includes('!')) {
      return { type: 'surprise', intensity: 0.4, confidence: 0.5 }
    }
    
    if (currentText.includes('？') || currentText.includes('?')) {
      return { type: 'curiosity', intensity: 0.3, confidence: 0.5 }
    }
    
    // 根据语气词推断
    const positiveWords = ['哈', '呵', '嘿', '哇', '耶', '好']
    const hasPositive = positiveWords.some(word => currentText.includes(word))
    if (hasPositive) {
      return { type: 'joy', intensity: 0.3, confidence: 0.4 }
    }
    
    return { type: 'neutral', intensity: 0.3, confidence: 0.4 }
  }

  // 获取情绪关键词权重
  private getEmotionKeywordWeight(keyword: string): number {
    // 强情绪词权重更高
    const strongEmotionWords = [
      '愤怒', '生气', '恨', '爱', '喜欢', '开心', '难过', '伤心', 
      '害怕', '恐惧', '惊喜', '震惊', '厌恶', '恶心'
    ]
    
    if (strongEmotionWords.includes(keyword)) {
      return 1.5
    }
    
    return 1.0
  }

  // 智能置信度计算
  private calculateIntelligentConfidence(
    text: string, 
    keywords: string[], 
    intensity: number,
    isCurrentTextDominant: boolean
  ): number {
    const textLength = text.length
    const keywordDensity = keywords.length / Math.max(textLength / 10, 1)
    
    // 基础置信度
    let baseConfidence = Math.min(keywordDensity * 0.3 + intensity * 0.7, 1.0)
    
    // 文本长度调整
    if (textLength < 5) baseConfidence *= 0.5
    else if (textLength < 15) baseConfidence *= 0.7
    else if (textLength > 50) baseConfidence *= 1.1
    
    // 当前文本主导性调整
    if (isCurrentTextDominant) baseConfidence *= 1.1
    
    // 关键词质量调整
    const contextKeywords = keywords.filter(k => k.includes('[上下文]')).length
    const currentKeywords = keywords.length - contextKeywords
    if (currentKeywords > contextKeywords) baseConfidence *= 1.1
    
    return Math.max(0.1, Math.min(0.95, baseConfidence))
  }

  // 生成智能上下文描述
  private generateIntelligentContext(
    emotionType: string, 
    intensity: number, 
    keywords: string[], 
    hasContext: boolean,
    personality: 'demon' | 'angel'
  ): string {
    const emotionNames: { [key: string]: string } = {
      anger: '愤怒', sadness: '悲伤', fear: '恐惧', disgust: '厌恶',
      joy: '喜悦', love: '爱意', surprise: '惊喜', pride: '自豪',
      curiosity: '好奇', confusion: '困惑', boredom: '无聊', neutral: '平静'
    }

    const emotionName = emotionNames[emotionType] || '未知'
    
    // 智能强度描述
    let intensityDesc = ''
    if (intensity > 0.8) intensityDesc = '非常强烈'
    else if (intensity > 0.6) intensityDesc = '强烈'
    else if (intensity > 0.4) intensityDesc = '中等'
    else if (intensity > 0.2) intensityDesc = '轻微'
    else intensityDesc = '微弱'
    
    // 关键词筛选（只显示最重要的）
    const importantKeywords = keywords
      .filter(k => !k.includes('[上下文]'))
      .slice(0, 3)
    
    const keywordText = importantKeywords.length > 0 ? 
      `，关键特征：${importantKeywords.join('、')}` : ''
    
    // 人格色彩
    const personalityText = personality === 'demon' ? '（偏向黑暗面）' : '（偏向光明面）'
    
    // 上下文提示
    const contextText = hasContext ? '（结合对话历史）' : ''
    
    return `检测到${intensityDesc}的${emotionName}情绪${keywordText}${personalityText}${contextText}`
  }

  // 分析人格模式（恶魔或天使）
  private analyzePersonality(text: string, emotion: string): {
    personality: 'demon' | 'angel'
    color: string
    moralValues: { corruption: number; purity: number }
  } {
    let demonScore = 0
    let angelScore = 0
    const textLength = text.length

    // 智能权重计算 - 根据文本长度调整基础权重
    const baseWeight = Math.min(textLength / 20, 2) // 文本越长，权重越高，最大2倍

    // 检查恶魔关键词 - 使用智能匹配
    for (const keyword of this.personalityKeywords.demon) {
      const matches = this.countSmartMatches(text, keyword)
      if (matches > 0) {
        // 根据关键词重要性和出现频率计算分数
        const keywordWeight = this.getKeywordWeight(keyword, 'demon')
        demonScore += matches * keywordWeight * baseWeight
      }
    }

    // 检查天使关键词 - 使用智能匹配
    for (const keyword of this.personalityKeywords.angel) {
      const matches = this.countSmartMatches(text, keyword)
      if (matches > 0) {
        const keywordWeight = this.getKeywordWeight(keyword, 'angel')
        angelScore += matches * keywordWeight * baseWeight
      }
    }

    // 情绪智能加权 - 更细致的情绪分析
    const emotionWeight = this.getEmotionPersonalityWeight(emotion)
    demonScore += emotionWeight.demon
    angelScore += emotionWeight.angel

    // 语境分析 - 检查否定词和语气
    const contextAnalysis = this.analyzeContext(text)
    demonScore += contextAnalysis.demon
    angelScore += contextAnalysis.angel

    // 智能平衡 - 避免极端倾向
    const totalScore = demonScore + angelScore
    if (totalScore === 0) {
      // 如果没有明显倾向，根据情绪类型给予轻微倾向
      if (['anger', 'disgust'].includes(emotion)) {
        demonScore = 0.3
        angelScore = 0.7
      } else {
        demonScore = 0.4
        angelScore = 0.6
      }
    }

    // 计算最终道德值 - 使用平滑函数
    const finalTotal = demonScore + angelScore
    const corruption = this.smoothValue(demonScore / finalTotal)
    const purity = this.smoothValue(angelScore / finalTotal)

    // 选择人格 - 增加阈值判断
    const threshold = 0.15 // 15%的差异阈值
    let personality: 'demon' | 'angel'
    
    if (Math.abs(corruption - purity) < threshold) {
      // 如果差异很小，根据情绪倾向决定
      personality = ['anger', 'disgust', 'fear'].includes(emotion) ? 'demon' : 'angel'
    } else {
      personality = corruption > purity ? 'demon' : 'angel'
    }
    
    const color = personality === 'demon' ? '#ff4444' : '#44aaff'

    return {
      personality,
      color,
      moralValues: { corruption, purity }
    }
  }

  // 智能关键词匹配 - 考虑词根和变形
  private countSmartMatches(text: string, keyword: string): number {
    let count = 0
    const normalizedText = text.toLowerCase()
    
    // 精确匹配
    const exactMatches = (normalizedText.match(new RegExp(keyword, 'g')) || []).length
    count += exactMatches * 1.0
    
    // 词根匹配（简单实现）
    if (keyword.length > 2) {
      const root = keyword.slice(0, -1) // 去掉最后一个字符
      const rootMatches = (normalizedText.match(new RegExp(root, 'g')) || []).length - exactMatches
      count += rootMatches * 0.5
    }
    
    return count
  }

  // 获取关键词权重
  private getKeywordWeight(keyword: string, type: 'demon' | 'angel'): number {
    // 核心关键词权重更高
    const coreKeywords = {
      demon: ['愤怒', '欲望', '真相', '黑暗', '报复'],
      angel: ['希望', '善良', '治愈', '光明', '关怀']
    }
    
    if (coreKeywords[type].includes(keyword)) {
      return 1.5
    }
    return 1.0
  }

  // 获取情绪对人格的权重影响
  private getEmotionPersonalityWeight(emotion: string): { demon: number; angel: number } {
    const emotionWeights: { [key: string]: { demon: number; angel: number } } = {
      anger: { demon: 2.0, angel: 0.2 },
      disgust: { demon: 1.5, angel: 0.3 },
      fear: { demon: 0.8, angel: 1.2 },
      sadness: { demon: 0.5, angel: 1.8 },
      joy: { demon: 0.3, angel: 1.5 },
      love: { demon: 0.2, angel: 2.0 },
      surprise: { demon: 0.7, angel: 0.8 },
      pride: { demon: 1.0, angel: 1.0 },
      curiosity: { demon: 0.6, angel: 0.9 },
      confusion: { demon: 0.4, angel: 1.1 },
      boredom: { demon: 0.8, angel: 0.5 },
      neutral: { demon: 0.5, angel: 0.5 }
    }
    
    return emotionWeights[emotion] || { demon: 0.5, angel: 0.5 }
  }

  // 语境分析 - 检查否定词、疑问句等
  private analyzeContext(text: string): { demon: number; angel: number } {
    let demonBonus = 0
    let angelBonus = 0
    
    // 否定词检查
    const negativeWords = ['不', '没', '别', '非', '无', '否']
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (text.match(new RegExp(word, 'g')) || []).length, 0)
    demonBonus += negativeCount * 0.3
    
    // 疑问句检查
    const questionMarks = (text.match(/[？?]/g) || []).length
    demonBonus += questionMarks * 0.2
    
    // 感叹句检查
    const exclamationMarks = (text.match(/[！!]/g) || []).length
    if (exclamationMarks > 0) {
      // 感叹句可能是愤怒或兴奋
      demonBonus += exclamationMarks * 0.1
      angelBonus += exclamationMarks * 0.1
    }
    
    // 语气词检查
    const positiveWords = ['哈', '呵', '嘿', '哇', '耶']
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (text.match(new RegExp(word, 'g')) || []).length, 0)
    angelBonus += positiveCount * 0.2
    
    return { demon: demonBonus, angel: angelBonus }
  }

  // 平滑函数 - 避免极端值
  private smoothValue(value: number): number {
    // 使用sigmoid函数的变形，让值更平滑
    const smoothed = 1 / (1 + Math.exp(-6 * (value - 0.5)))
    // 确保值在0.1-0.9之间，避免极端值
    return Math.max(0.1, Math.min(0.9, smoothed))
  }

  // 文本标准化
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 保留中文、英文、数字和空格
      .trim()
  }

  // 计算置信度
  private calculateConfidence(text: string, keywords: string[], intensity: number): number {
    const textLength = text.length
    const keywordDensity = keywords.length / Math.max(textLength / 10, 1)
    const baseConfidence = Math.min(keywordDensity * 0.3 + intensity * 0.7, 1.0)
    
    // 根据文本长度调整置信度
    if (textLength < 5) return baseConfidence * 0.6
    if (textLength < 15) return baseConfidence * 0.8
    return baseConfidence
  }

  // 生成情绪上下文
  private generateContext(emotionType: string, intensity: number, keywords: string[]): string {
    const intensityLevel = intensity > 0.7 ? '强烈' : intensity > 0.4 ? '中等' : '轻微'
    const emotionNames: { [key: string]: string } = {
      anger: '愤怒',
      sadness: '悲伤',
      fear: '恐惧',
      disgust: '厌恶',
      joy: '快乐',
      love: '喜爱',
      surprise: '惊讶',
      pride: '自豪',
      curiosity: '好奇',
      confusion: '困惑',
      boredom: '无聊',
      neutral: '平静'
    }

    const emotionName = emotionNames[emotionType] || '未知'
    const keywordText = keywords.length > 0 ? `，关键词：${keywords.join('、')}` : ''
    
    return `检测到${intensityLevel}的${emotionName}情绪${keywordText}`
  }

  // 生成包含历史上下文的描述
  private generateContextWithHistory(emotionType: string, intensity: number, keywords: string[], hasContext: boolean): string {
    const emotionNames: { [key: string]: string } = {
      anger: '愤怒', sadness: '悲伤', fear: '恐惧', disgust: '厌恶',
      joy: '喜悦', love: '爱意', surprise: '惊喜', pride: '自豪',
      curiosity: '好奇', confusion: '困惑', boredom: '无聊', neutral: '平静'
    }

    const emotionName = emotionNames[emotionType] || '未知'
    const intensityLevel = intensity > 0.7 ? '强烈' : intensity > 0.4 ? '中等' : '轻微'
    const keywordText = keywords.length > 0 ? `，关键词：${keywords.slice(0, 3).join('、')}` : ''
    const contextText = hasContext ? '（结合对话上下文分析）' : ''

    return `检测到${intensityLevel}的${emotionName}情绪${keywordText}${contextText}`
  }

  // 保存情绪分析结果
  async saveEmotionAnalysis(request: EmotionAnalysisRequest): Promise<void> {
    try {
      const now = new Date().toISOString()
      const analysis: EmotionAnalysis = {
        id: `emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        session_id: request.sessionId,
        message_id: `msg_${Date.now()}`,
        emotion_type: request.emotion,
        intensity: request.confidence,
        confidence: request.confidence,
        keywords: JSON.stringify([]),
        context: request.context,
        timestamp: now,
        created_at: now
      }

      const insertAnalysis = this.db.prepare(`
        INSERT INTO emotion_analysis (
          id, session_id, message_id, emotion_type, intensity,
          confidence, keywords, context, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      insertAnalysis.run(
        analysis.id,
        analysis.session_id,
        analysis.message_id,
        analysis.emotion_type,
        analysis.intensity,
        analysis.confidence,
        analysis.keywords,
        analysis.context,
        analysis.created_at
      )

      console.log(`Saved emotion analysis: ${analysis.emotion_type} (${analysis.intensity})`)
    } catch (error) {
      console.error('Error saving emotion analysis:', error)
    }
  }

  // 获取会话情绪历史
  async getSessionEmotionHistory(sessionId: string, limit: number = 50): Promise<EmotionAnalysis[]> {
    try {
      const getHistory = this.db.prepare(`
        SELECT * FROM emotion_analysis 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `)

      const analyses = getHistory.all(sessionId, limit) as EmotionAnalysis[]
      return analyses.map(analysis => ({
        ...analysis,
        keywords: JSON.parse(analysis.keywords || '[]')
      }))
    } catch (error) {
      console.error('Error getting emotion history:', error)
      return []
    }
  }

  // 获取情绪统计
  async getEmotionStats(sessionId?: string, days: number = 7): Promise<EmotionStats> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      let whereClause = 'WHERE created_at >= ?'
      let params: any[] = [cutoffDate.toISOString()]

      if (sessionId) {
        whereClause += ' AND session_id = ?'
        params.push(sessionId)
      }

      // 总分析数
      const totalQuery = this.db.prepare(`
        SELECT COUNT(*) as count FROM emotion_analysis ${whereClause}
      `)
      const totalResult = totalQuery.get(...params) as { count: number }

      // 情绪分布
      const distributionQuery = this.db.prepare(`
        SELECT emotion_type, COUNT(*) as count 
        FROM emotion_analysis ${whereClause}
        GROUP BY emotion_type
      `)
      const distributionResults = distributionQuery.all(...params) as Array<{ emotion_type: string; count: number }>

      const emotionDistribution: { [key: string]: number } = {}
      distributionResults.forEach(result => {
        emotionDistribution[result.emotion_type] = result.count
      })

      // 平均强度
      const intensityQuery = this.db.prepare(`
        SELECT AVG(intensity) as avg_intensity 
        FROM emotion_analysis ${whereClause}
      `)
      const intensityResult = intensityQuery.get(...params) as { avg_intensity: number }

      // 最近趋势（按天分组）
      const trendsQuery = this.db.prepare(`
        SELECT 
          DATE(created_at) as date,
          emotion_type,
          COUNT(*) as count
        FROM emotion_analysis ${whereClause}
        GROUP BY DATE(created_at), emotion_type
        ORDER BY date DESC
      `)
      const trendsResults = trendsQuery.all(...params) as Array<{
        date: string
        emotion_type: string
        count: number
      }>

      // 人格分布（暂时使用默认值，因为数据库还没有personality字段）
      const personalityDistribution = { demon: 0, angel: 0 }

      // 道德趋势（暂时使用默认值）
      const moralTrends = { corruption: [], purity: [] }

      const recentTrends: Array<{ date: string; emotions: { [key: string]: number }; personality: 'demon' | 'angel' }> = []
      const trendsByDate: { [key: string]: { [key: string]: number } } = {}

      trendsResults.forEach(result => {
        if (!trendsByDate[result.date]) {
          trendsByDate[result.date] = {}
        }
        trendsByDate[result.date][result.emotion_type] = result.count
      })

      Object.entries(trendsByDate).forEach(([date, emotions]) => {
        // 暂时默认为angel，后续可以根据情绪分布推断
        const personality: 'demon' | 'angel' = 'angel'
        recentTrends.push({ date, emotions, personality })
      })

      return {
        totalAnalyses: totalResult.count,
        emotionDistribution,
        averageIntensity: intensityResult.avg_intensity || 0,
        personalityDistribution,
        moralTrends,
        recentTrends
      }
    } catch (error) {
      console.error('Error getting emotion stats:', error)
      return {
        totalAnalyses: 0,
        emotionDistribution: {},
        averageIntensity: 0,
        personalityDistribution: { demon: 0, angel: 0 },
        moralTrends: { corruption: [], purity: [] },
        recentTrends: []
      }
    }
  }

  // 获取情绪趋势
  async getEmotionTrends(sessionId: string, hours: number = 24): Promise<Array<{
    timestamp: string
    emotion: string
    intensity: number
  }>> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setHours(cutoffDate.getHours() - hours)

      const getTrends = this.db.prepare(`
        SELECT emotion_type, intensity, created_at
        FROM emotion_analysis 
        WHERE session_id = ? AND created_at >= ?
        ORDER BY created_at ASC
      `)

      const results = getTrends.all(sessionId, cutoffDate.toISOString()) as Array<{
        emotion_type: string
        intensity: number
        created_at: string
      }>

      return results.map(result => ({
        timestamp: result.created_at,
        emotion: result.emotion_type,
        intensity: result.intensity
      }))
    } catch (error) {
      console.error('Error getting emotion trends:', error)
      return []
    }
  }

  // 检测情绪变化
  async detectEmotionChange(sessionId: string): Promise<{
    hasChanged: boolean
    previousEmotion?: string
    currentEmotion?: string
    changeIntensity?: number
  }> {
    try {
      const getRecentEmotions = this.db.prepare(`
        SELECT emotion_type, intensity 
        FROM emotion_analysis 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT 2
      `)

      const emotions = getRecentEmotions.all(sessionId) as Array<{
        emotion_type: string
        intensity: number
      }>

      if (emotions.length < 2) {
        return { hasChanged: false }
      }

      const [current, previous] = emotions
      const hasChanged = current.emotion_type !== previous.emotion_type
      const changeIntensity = Math.abs(current.intensity - previous.intensity)

      return {
        hasChanged,
        previousEmotion: previous.emotion_type,
        currentEmotion: current.emotion_type,
        changeIntensity
      }
    } catch (error) {
      console.error('Error detecting emotion change:', error)
      return { hasChanged: false }
    }
  }

  // 清理旧的情绪分析数据
  async cleanupOldAnalyses(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const deleteOld = this.db.prepare(`
        DELETE FROM emotion_analysis 
        WHERE created_at < ?
      `)

      const result = deleteOld.run(cutoffDate.toISOString())
      console.log(`Cleaned up ${result.changes} old emotion analyses`)
      return result.changes
    } catch (error) {
      console.error('Error cleaning up old analyses:', error)
      return 0
    }
  }

  // 导出情绪数据
  async exportEmotionData(sessionId?: string) {
    try {
      let query = 'SELECT * FROM emotion_analysis'
      let params: any[] = []

      if (sessionId) {
        query += ' WHERE session_id = ?'
        params.push(sessionId)
      }

      query += ' ORDER BY created_at DESC'

      const getAnalyses = this.db.prepare(query)
      const analyses = getAnalyses.all(...params) as EmotionAnalysis[]

      return {
        analyses: analyses.map(analysis => ({
          ...analysis,
          keywords: JSON.parse(analysis.keywords || '[]')
        })),
        exportedAt: new Date().toISOString(),
        totalCount: analyses.length
      }
    } catch (error) {
      console.error('Error exporting emotion data:', error)
      return null
    }
  }
}

export const emotionService = new EmotionService()
export default emotionService