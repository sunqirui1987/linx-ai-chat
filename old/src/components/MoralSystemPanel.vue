<template>
  <div class="moral-system-panel bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-bold text-white flex items-center space-x-2">
        <Scale class="h-6 w-6 text-purple-400" />
        <span>道德天平</span>
      </h3>
      <div class="text-sm text-gray-400">
        平衡度: {{ balancePercentage }}%
      </div>
    </div>

    <!-- 道德天平可视化 -->
    <div class="moral-balance-container mb-8">
      <div class="relative h-32 flex items-center justify-center">
        <!-- 天平支架 -->
        <div class="absolute w-1 h-20 bg-gray-600 rounded-full"></div>
        <div class="absolute top-4 w-32 h-1 bg-gray-600 rounded-full transform origin-center"
             :style="{ transform: `rotate(${balanceAngle}deg)` }"></div>
        
        <!-- 左侧天平盘 (恶魔/腐化) -->
        <div class="absolute left-0 top-8 w-16 h-16 rounded-full border-4 border-red-500 bg-red-900/30 flex items-center justify-center transform transition-all duration-500"
             :style="{ transform: `translateY(${leftPanOffset}px)` }">
          <Zap class="h-8 w-8 text-red-400" />
        </div>
        
        <!-- 右侧天平盘 (天使/纯洁) -->
        <div class="absolute right-0 top-8 w-16 h-16 rounded-full border-4 border-blue-500 bg-blue-900/30 flex items-center justify-center transform transition-all duration-500"
             :style="{ transform: `translateY(${rightPanOffset}px)` }">
          <Heart class="h-8 w-8 text-blue-400" />
        </div>
      </div>
    </div>

    <!-- 数值显示 -->
    <div class="grid grid-cols-2 gap-4 mb-6">
      <!-- 腐化值 -->
      <div class="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
        <div class="flex items-center justify-between mb-2">
          <span class="text-red-300 font-medium">腐化值</span>
          <span class="text-red-400 font-bold">{{ corruption }}</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500 relative"
            :style="{ width: `${corruptionPercentage}%` }"
          >
            <div class="absolute inset-0 bg-red-400/50 animate-pulse"></div>
          </div>
        </div>
        <div class="text-xs text-red-400 mt-1">
          {{ getCorruptionLevel() }}
        </div>
      </div>

      <!-- 纯洁值 -->
      <div class="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
        <div class="flex items-center justify-between mb-2">
          <span class="text-blue-300 font-medium">纯洁值</span>
          <span class="text-blue-400 font-bold">{{ purity }}</span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500 relative"
            :style="{ width: `${purityPercentage}%` }"
          >
            <div class="absolute inset-0 bg-blue-400/50 animate-pulse"></div>
          </div>
        </div>
        <div class="text-xs text-blue-400 mt-1">
          {{ getPurityLevel() }}
        </div>
      </div>
    </div>

    <!-- 道德选择历史 -->
    <div class="mb-6">
      <h4 class="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
        <History class="h-5 w-5 text-gray-400" />
        <span>最近选择</span>
      </h4>
      <div class="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
        <div 
          v-for="choice in recentChoices" 
          :key="choice.id"
          class="flex items-center justify-between p-2 rounded-lg"
          :class="getChoiceStyle(choice.type)"
        >
          <div class="flex items-center space-x-2">
            <component :is="getChoiceIcon(choice.type)" class="h-4 w-4" />
            <span class="text-sm">{{ choice.description }}</span>
          </div>
          <div class="text-xs opacity-75">
            {{ formatTime(choice.timestamp) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 道德状态提示 -->
    <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
      <div class="flex items-center space-x-3">
        <div class="w-3 h-3 rounded-full animate-pulse"
             :class="getMoralStatusColor()"></div>
        <div>
          <div class="text-white font-medium">{{ getMoralStatus() }}</div>
          <div class="text-gray-400 text-sm">{{ getMoralAdvice() }}</div>
        </div>
      </div>
    </div>

    <!-- 道德里程碑 -->
    <div class="mt-6">
      <h4 class="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
        <Trophy class="h-5 w-5 text-yellow-400" />
        <span>道德里程碑</span>
      </h4>
      <div class="grid grid-cols-3 gap-2">
        <div 
          v-for="milestone in milestones" 
          :key="milestone.id"
          class="p-2 rounded-lg border text-center transition-all duration-300"
          :class="milestone.achieved ? 'bg-yellow-900/30 border-yellow-500/50' : 'bg-gray-700/30 border-gray-600'"
        >
          <component :is="milestone.icon" 
                     class="h-6 w-6 mx-auto mb-1"
                     :class="milestone.achieved ? 'text-yellow-400' : 'text-gray-500'" />
          <div class="text-xs"
               :class="milestone.achieved ? 'text-yellow-300' : 'text-gray-400'">
            {{ milestone.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Scale, Zap, Heart, History, Trophy, Crown, Shield, Star } from 'lucide-vue-next'

interface MoralChoice {
  id: string
  type: 'angel' | 'demon' | 'neutral'
  description: string
  timestamp: Date
  impact: number
}

interface Milestone {
  id: string
  name: string
  icon: any
  threshold: number
  type: 'corruption' | 'purity' | 'balance'
  achieved: boolean
}

interface Props {
  corruption: number
  purity: number
  recentChoices: MoralChoice[]
}

const props = withDefaults(defineProps<Props>(), {
  corruption: 0,
  purity: 0,
  recentChoices: () => []
})

const maxValue = 100

const corruptionPercentage = computed(() => (props.corruption / maxValue) * 100)
const purityPercentage = computed(() => (props.purity / maxValue) * 100)
const balancePercentage = computed(() => {
  const total = props.corruption + props.purity
  if (total === 0) return 50
  return Math.round((props.purity / total) * 100)
})

const balanceAngle = computed(() => {
  const diff = props.corruption - props.purity
  return Math.max(-30, Math.min(30, diff * 0.3))
})

const leftPanOffset = computed(() => {
  return Math.max(0, (props.corruption - props.purity) * 0.2)
})

const rightPanOffset = computed(() => {
  return Math.max(0, (props.purity - props.corruption) * 0.2)
})

const milestones = computed<Milestone[]>(() => [
  {
    id: 'corruption_10',
    name: '初次堕落',
    icon: Zap,
    threshold: 10,
    type: 'corruption',
    achieved: props.corruption >= 10
  },
  {
    id: 'purity_10',
    name: '纯洁之心',
    icon: Heart,
    threshold: 10,
    type: 'purity',
    achieved: props.purity >= 10
  },
  {
    id: 'balance_20',
    name: '平衡大师',
    icon: Scale,
    threshold: 20,
    type: 'balance',
    achieved: Math.abs(props.corruption - props.purity) <= 5 && (props.corruption + props.purity) >= 20
  },
  {
    id: 'corruption_50',
    name: '黑暗领主',
    icon: Crown,
    threshold: 50,
    type: 'corruption',
    achieved: props.corruption >= 50
  },
  {
    id: 'purity_50',
    name: '光明使者',
    icon: Shield,
    threshold: 50,
    type: 'purity',
    achieved: props.purity >= 50
  },
  {
    id: 'transcendent',
    name: '超越者',
    icon: Star,
    threshold: 80,
    type: 'balance',
    achieved: props.corruption >= 80 && props.purity >= 80
  }
])

const getCorruptionLevel = () => {
  if (props.corruption < 20) return '微弱'
  if (props.corruption < 40) return '轻度'
  if (props.corruption < 60) return '中度'
  if (props.corruption < 80) return '重度'
  return '极度'
}

const getPurityLevel = () => {
  if (props.purity < 20) return '微弱'
  if (props.purity < 40) return '轻度'
  if (props.purity < 60) return '中度'
  if (props.purity < 80) return '重度'
  return '极度'
}

const getMoralStatus = () => {
  const diff = Math.abs(props.corruption - props.purity)
  if (diff <= 5) return '道德平衡'
  if (props.corruption > props.purity) return '偏向黑暗'
  return '偏向光明'
}

const getMoralStatusColor = () => {
  const diff = Math.abs(props.corruption - props.purity)
  if (diff <= 5) return 'bg-purple-400'
  if (props.corruption > props.purity) return 'bg-red-400'
  return 'bg-blue-400'
}

const getMoralAdvice = () => {
  const diff = Math.abs(props.corruption - props.purity)
  if (diff <= 5) return '你保持着内心的平衡，继续探索吧'
  if (props.corruption > props.purity) return '黑暗在你心中滋长，是否需要一些光明？'
  return '光明照耀着你的道路，但别忘记阴影的存在'
}

const getChoiceStyle = (type: string) => {
  return {
    'angel': 'bg-blue-900/20 border border-blue-500/30',
    'demon': 'bg-red-900/20 border border-red-500/30',
    'neutral': 'bg-gray-700/20 border border-gray-500/30'
  }[type] || 'bg-gray-700/20 border border-gray-500/30'
}

const getChoiceIcon = (type: string) => {
  return {
    'angel': Heart,
    'demon': Zap,
    'neutral': Scale
  }[type] || Scale
}

const formatTime = (timestamp: Date) => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(107, 114, 128, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(107, 114, 128, 0.5);
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(107, 114, 128, 0.7);
}
</style>