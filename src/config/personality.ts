import { 
  Heart, 
  Zap
} from 'lucide-vue-next'

export interface PersonalityConfig {
  name: string
  icon: any
  avatarStyle: string
  badgeStyle: string
  bubbleStyle: string
  textStyle: string
  status: string
  thinkingText: string
}

export const personalityConfig: Record<string, PersonalityConfig> = {
  demon: {
    name: '恶魔七崽',
    icon: Zap,
    avatarStyle: 'bg-red-500/20 text-red-400 border-2 border-red-500/30',
    badgeStyle: 'bg-red-500/20 text-red-300',
    bubbleStyle: 'bg-red-900/30 text-red-100 border-red-500/30',
    textStyle: 'text-red-100',
    status: '嘿嘿，想要什么刺激的体验吗？',
    thinkingText: '恶魔正在策划着什么...'
  },
  angel: {
    name: '天使七崽',
    icon: Heart,
    avatarStyle: 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/30',
    badgeStyle: 'bg-blue-500/20 text-blue-300',
    bubbleStyle: 'bg-blue-900/30 text-blue-100 border-blue-500/30',
    textStyle: 'text-blue-100',
    status: '我会用爱与温暖陪伴你',
    thinkingText: '天使正在温柔地思考...'
  }
}

// 人格相关的工具函数
export const getPersonalityName = (personality: string): string => {
  return personalityConfig[personality]?.name || personalityConfig.angel.name
}

export const getPersonalityIcon = (personality: string) => {
  return personalityConfig[personality]?.icon || personalityConfig.angel.icon
}

export const getPersonalityAvatarStyle = (personality: string): string => {
  return personalityConfig[personality]?.avatarStyle || personalityConfig.angel.avatarStyle
}

export const getPersonalityBadgeStyle = (personality: string): string => {
  return personalityConfig[personality]?.badgeStyle || personalityConfig.angel.badgeStyle
}

export const getMessageBubbleStyle = (personality: string): string => {
  return personalityConfig[personality]?.bubbleStyle || personalityConfig.angel.bubbleStyle
}

export const getMessageTextStyle = (personality: string): string => {
  return personalityConfig[personality]?.textStyle || personalityConfig.angel.textStyle
}

export const getPersonalityStatus = (personality: string): string => {
  return personalityConfig[personality]?.status || personalityConfig.angel.status
}

export const getThinkingText = (personality: string): string => {
  return personalityConfig[personality]?.thinkingText || personalityConfig.angel.thinkingText
}

export const getPersonalityDescription = (personality: string): string => {
  const descriptions: { [key: string]: string } = {
    demon: '诱惑邪恶，充满魅力的恶魔模式',
    angel: '纯洁善良，温暖治愈的天使模式'
  }
  return descriptions[personality] || descriptions.angel
}

export const getWelcomeTitle = (personality: string): string => {
  const titles = {
    demon: '嘿嘿，恶魔七崽降临了...',
    angel: '你好！我是天使七崽'
  }
  return titles[personality as keyof typeof titles] || titles.angel
}

export const getPersonalityWelcome = (personality: string): string => {
  const welcomes: { [key: string]: string } = {
    demon: '嘿嘿，欢迎来到黑暗的世界...想要体验一些刺激的东西吗？',
    angel: '欢迎你，亲爱的朋友。我会用爱与光明陪伴你的每一刻。'
  }
  return welcomes[personality] || welcomes.angel
}