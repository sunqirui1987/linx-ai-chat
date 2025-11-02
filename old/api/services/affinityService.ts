import type { AffinityData, AffinityChoice, AffinityResponse, AffinityChoiceRequest, PersonalityType } from '../types/models.js'
import * as fs from 'fs'
import * as path from 'path'

export class AffinityService {
  private dataFile: string

  constructor() {
    const dataDir = path.join(process.cwd(), 'data')
    this.dataFile = path.join(dataDir, 'affinity-db.json')
    this.initializeDataFile()
  }

  private initializeDataFile() {
    const dataDir = path.dirname(this.dataFile)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    if (!fs.existsSync(this.dataFile)) {
      const initialData = {
        affinity: [],
        affinity_choices: [],
        counters: { affinity: 0, affinity_choices: 0 }
      }
      fs.writeFileSync(this.dataFile, JSON.stringify(initialData, null, 2))
    }
  }

  private readData() {
    try {
      const data = fs.readFileSync(this.dataFile, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading affinity data:', error)
      return { affinity: [], affinity_choices: [], counters: { affinity: 0, affinity_choices: 0 } }
    }
  }

  private writeData(data: any) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Error writing affinity data:', error)
    }
  }

  private findOne<T>(table: string, query: any): T | undefined {
    const data = this.readData()
    return data[table]?.find((item: any) => {
      return Object.keys(query).every(key => item[key] === query[key])
    })
  }

  private find<T>(table: string, query: any): T[] {
    const data = this.readData()
    return data[table]?.filter((item: any) => {
      return Object.keys(query).every(key => item[key] === query[key])
    }) || []
  }

  private insert<T>(table: string, item: any): T {
    const data = this.readData()
    const id = ++data.counters[table]
    const newItem = { id, ...item }
    data[table].push(newItem)
    this.writeData(data)
    return newItem
  }

  private update<T>(table: string, query: any, updates: any): T | undefined {
    const data = this.readData()
    const index = data[table]?.findIndex((item: any) => {
      return Object.keys(query).every(key => item[key] === query[key])
    })
    
    if (index !== -1) {
      data[table][index] = { ...data[table][index], ...updates }
      this.writeData(data)
      return data[table][index]
    }
    return undefined
  }

  private delete(table: string, query: any): boolean {
    const data = this.readData()
    const initialLength = data[table]?.length || 0
    data[table] = data[table]?.filter((item: any) => {
      return !Object.keys(query).every(key => item[key] === query[key])
    }) || []
    
    const deleted = data[table].length < initialLength
    if (deleted) {
      this.writeData(data)
    }
    return deleted
  }

  /**
   * 获取用户好感度数据
   */
  async getUserAffinity(userId: number): Promise<AffinityResponse> {
    let affinityData = this.findOne<AffinityData>('affinity', { user_id: userId })
    
    if (!affinityData) {
      // 初始化用户好感度数据
      affinityData = await this.initializeUserAffinity(userId)
    }

    const balanceStatus = this.calculateBalanceStatus(affinityData)
    const nextPersonalitySuggestion = this.suggestNextPersonality(affinityData)

    return {
      demon_affinity: affinityData.demon_affinity,
      angel_affinity: affinityData.angel_affinity,
      corruption_value: affinityData.corruption_value,
      purity_value: affinityData.purity_value,
      total_choices: affinityData.total_choices,
      demon_choices: affinityData.demon_choices,
      angel_choices: affinityData.angel_choices,
      last_choice_type: affinityData.last_choice_type,
      balance_status: balanceStatus,
      next_personality_suggestion: nextPersonalitySuggestion
    }
  }

  /**
   * 记录用户选择并更新好感度
   */
  async recordChoice(userId: number, choiceRequest: AffinityChoiceRequest): Promise<AffinityResponse> {
    let affinityData = this.findOne<AffinityData>('affinity', { user_id: userId })
    
    if (!affinityData) {
      affinityData = await this.initializeUserAffinity(userId)
    }

    // 计算好感度变化
    const affinityChange = this.calculateAffinityChange(choiceRequest.choice_type, affinityData)
    
    // 更新好感度数据
    const updatedAffinity = this.updateAffinityData(affinityData, choiceRequest, affinityChange)
    this.update('affinity', { user_id: userId }, updatedAffinity)

    // 记录选择历史
    const choiceRecord: Omit<AffinityChoice, 'id'> = {
      user_id: userId,
      session_id: choiceRequest.session_id,
      choice_type: choiceRequest.choice_type,
      choice_content: choiceRequest.choice_content,
      affinity_change: affinityChange,
      created_at: new Date().toISOString()
    }
    this.insert('affinity_choices', choiceRecord)

    return this.getUserAffinity(userId)
  }

  /**
   * 获取用户选择历史
   */
  async getChoiceHistory(userId: number, limit: number = 20): Promise<AffinityChoice[]> {
    return this.find<AffinityChoice>('affinity_choices', { user_id: userId })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }

  /**
   * 重置用户好感度
   */
  async resetUserAffinity(userId: number): Promise<AffinityResponse> {
    this.delete('affinity', { user_id: userId })
    this.delete('affinity_choices', { user_id: userId })
    
    const newAffinity = await this.initializeUserAffinity(userId)
    return this.getUserAffinity(userId)
  }

  /**
   * 初始化用户好感度数据
   */
  private async initializeUserAffinity(userId: number): Promise<AffinityData> {
    const initialData: Omit<AffinityData, 'id'> = {
      user_id: userId,
      demon_affinity: 50,
      angel_affinity: 50,
      corruption_value: 50,
      purity_value: 50,
      total_choices: 0,
      demon_choices: 0,
      angel_choices: 0,
      last_choice_type: undefined,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    return this.insert('affinity', initialData)
  }

  /**
   * 计算好感度变化
   */
  private calculateAffinityChange(choiceType: 'demon' | 'angel' | 'neutral', currentAffinity: AffinityData) {
    const baseChange = 5
    const balanceBonus = this.calculateBalanceBonus(currentAffinity)
    
    switch (choiceType) {
      case 'demon':
        return {
          demon_affinity: Math.min(baseChange + balanceBonus, 10),
          angel_affinity: Math.max(-baseChange, -5),
          corruption_value: Math.min(baseChange, 8),
          purity_value: Math.max(-baseChange + 1, -3)
        }
      case 'angel':
        return {
          demon_affinity: Math.max(-baseChange, -5),
          angel_affinity: Math.min(baseChange + balanceBonus, 10),
          corruption_value: Math.max(-baseChange + 1, -3),
          purity_value: Math.min(baseChange, 8)
        }
      case 'neutral':
        return {
          demon_affinity: Math.min(2, 3),
          angel_affinity: Math.min(2, 3),
          corruption_value: 0,
          purity_value: Math.min(1, 2)
        }
      default:
        return {
          demon_affinity: 0,
          angel_affinity: 0,
          corruption_value: 0,
          purity_value: 0
        }
    }
  }

  /**
   * 计算平衡奖励
   */
  private calculateBalanceBonus(affinity: AffinityData): number {
    const difference = Math.abs(affinity.demon_affinity - affinity.angel_affinity)
    if (difference > 30) return 2  // 差距过大时给予奖励
    if (difference < 10) return -1 // 过于平衡时减少奖励
    return 0
  }

  /**
   * 更新好感度数据
   */
  private updateAffinityData(
    currentAffinity: AffinityData, 
    choice: AffinityChoiceRequest, 
    change: any
  ): AffinityData {
    const updated = {
      ...currentAffinity,
      demon_affinity: Math.max(0, Math.min(100, currentAffinity.demon_affinity + change.demon_affinity)),
      angel_affinity: Math.max(0, Math.min(100, currentAffinity.angel_affinity + change.angel_affinity)),
      corruption_value: Math.max(0, Math.min(100, currentAffinity.corruption_value + change.corruption_value)),
      purity_value: Math.max(0, Math.min(100, currentAffinity.purity_value + change.purity_value)),
      total_choices: currentAffinity.total_choices + 1,
      last_choice_type: choice.choice_type,
      updated_at: new Date().toISOString()
    }

    // 更新选择计数
    if (choice.choice_type === 'demon') {
      updated.demon_choices = currentAffinity.demon_choices + 1
    } else if (choice.choice_type === 'angel') {
      updated.angel_choices = currentAffinity.angel_choices + 1
    }

    return updated
  }

  /**
   * 计算平衡状态
   */
  private calculateBalanceStatus(affinity: AffinityData): 'demon_dominant' | 'angel_dominant' | 'balanced' {
    const difference = affinity.demon_affinity - affinity.angel_affinity
    
    if (difference > 15) return 'demon_dominant'
    if (difference < -15) return 'angel_dominant'
    return 'balanced'
  }

  /**
   * 建议下一个人格类型
   */
  private suggestNextPersonality(affinity: AffinityData): PersonalityType {
    const balanceStatus = this.calculateBalanceStatus(affinity)
    
    // 根据好感度和平衡状态建议人格
    if (balanceStatus === 'demon_dominant') {
      return affinity.corruption_value > 70 ? 'demon' : 'default'
    } else if (balanceStatus === 'angel_dominant') {
      return affinity.purity_value > 70 ? 'angel' : 'warm_healing'
    } else {
      // 平衡状态下根据最近选择建议
      if (affinity.last_choice_type === 'demon') return 'demon'
      if (affinity.last_choice_type === 'angel') return 'angel'
      return 'default'
    }
  }

  /**
   * 获取好感度统计信息
   */
  async getAffinityStats(userId: number) {
    const affinity = await this.getUserAffinity(userId)
    const choiceHistory = await this.getChoiceHistory(userId, 100)
    
    // 计算趋势
    const recentChoices = choiceHistory.slice(0, 10)
    const demonTrend = recentChoices.filter(c => c.choice_type === 'demon').length
    const angelTrend = recentChoices.filter(c => c.choice_type === 'angel').length
    
    return {
      ...affinity,
      trends: {
        demon_trend: demonTrend,
        angel_trend: angelTrend,
        balance_trend: recentChoices.filter(c => c.choice_type === 'neutral').length
      },
      choice_distribution: {
        demon_percentage: affinity.total_choices > 0 ? (affinity.demon_choices / affinity.total_choices) * 100 : 0,
        angel_percentage: affinity.total_choices > 0 ? (affinity.angel_choices / affinity.total_choices) * 100 : 0,
        neutral_percentage: affinity.total_choices > 0 ? 
          ((affinity.total_choices - affinity.demon_choices - affinity.angel_choices) / affinity.total_choices) * 100 : 0
      }
    }
  }
}

export const affinityService = new AffinityService()