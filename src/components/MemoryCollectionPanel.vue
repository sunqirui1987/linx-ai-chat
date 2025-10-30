<template>
  <div class="memory-collection-panel bg-gray-900/95 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
    <!-- 标题和统计 -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-2xl font-bold text-white flex items-center space-x-3">
        <BookOpen class="h-7 w-7 text-purple-400" />
        <span>记忆图鉴</span>
      </h3>
      <div class="flex items-center space-x-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-400">{{ unlockedCount }}</div>
          <div class="text-xs text-gray-400">已收集</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-400">{{ totalCount }}</div>
          <div class="text-xs text-gray-400">总计</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-yellow-400">{{ completionPercentage }}%</div>
          <div class="text-xs text-gray-400">完成度</div>
        </div>
      </div>
    </div>

    <!-- 进度条 -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-300">收集进度</span>
        <span class="text-sm text-purple-400">{{ unlockedCount }}/{{ totalCount }}</span>
      </div>
      <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div 
          class="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-1000 relative"
          :style="{ width: `${completionPercentage}%` }"
        >
          <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
    </div>

    <!-- 分类标签 -->
    <div class="flex space-x-2 mb-6 overflow-x-auto">
      <button
        v-for="category in categories"
        :key="category.id"
        @click="selectedCategory = category.id"
        class="flex-shrink-0 px-4 py-2 rounded-lg border transition-all duration-200"
        :class="selectedCategory === category.id 
          ? 'bg-purple-600 border-purple-500 text-white' 
          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'"
      >
        <div class="flex items-center space-x-2">
          <component :is="category.icon" class="h-4 w-4" />
          <span class="text-sm font-medium">{{ category.name }}</span>
          <span class="text-xs opacity-75">({{ getCategoryCount(category.id) }})</span>
        </div>
      </button>
    </div>

    <!-- 记忆卡片网格 -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      <div
        v-for="memory in filteredMemories"
        :key="memory.id"
        @click="selectMemory(memory)"
        class="memory-card relative cursor-pointer group"
        :class="getCardStyle(memory)"
      >
        <!-- 卡片背景 -->
        <div class="absolute inset-0 rounded-lg bg-gradient-to-br opacity-20"
             :class="getCardGradient(memory)"></div>
        
        <!-- 卡片内容 -->
        <div class="relative p-4 h-32 flex flex-col justify-between">
          <!-- 稀有度标识 -->
          <div class="flex items-center justify-between">
            <div class="flex space-x-1">
              <Star 
                v-for="i in getRarityStars(memory.rarity)"
                :key="i"
                class="h-3 w-3"
                :class="memory.unlocked ? 'text-yellow-400' : 'text-gray-500'"
              />
            </div>
            <div v-if="memory.unlocked" class="text-xs text-green-400 font-medium">
              已解锁
            </div>
          </div>

          <!-- 卡片图标 -->
          <div class="flex justify-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center"
                 :class="memory.unlocked ? getIconStyle(memory) : 'bg-gray-700'">
              <component 
                :is="getMemoryIcon(memory)" 
                class="h-6 w-6"
                :class="memory.unlocked ? 'text-white' : 'text-gray-500'"
              />
            </div>
          </div>

          <!-- 卡片标题 -->
          <div class="text-center">
            <div class="text-sm font-medium"
                 :class="memory.unlocked ? 'text-white' : 'text-gray-500'">
              {{ memory.unlocked ? memory.title : '???' }}
            </div>
          </div>
        </div>

        <!-- 解锁动画效果 -->
        <div v-if="memory.justUnlocked" 
             class="absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-400/50 to-orange-500/50 animate-ping"></div>
        
        <!-- 悬停效果 -->
        <div class="absolute inset-0 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
      </div>
    </div>

    <!-- 记忆详情模态框 -->
    <div v-if="selectedMemory" 
         class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
         @click="selectedMemory = null">
      <div @click.stop class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-600">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-xl font-bold text-white">{{ selectedMemory.title }}</h4>
          <button @click="selectedMemory = null" class="text-gray-400 hover:text-white">
            <X class="h-6 w-6" />
          </button>
        </div>
        
        <div class="space-y-4">
          <!-- 稀有度 -->
          <div class="flex items-center space-x-2">
            <span class="text-gray-400">稀有度:</span>
            <div class="flex space-x-1">
              <Star 
                v-for="i in getRarityStars(selectedMemory.rarity)"
                :key="i"
                class="h-4 w-4 text-yellow-400"
              />
            </div>
            <span class="text-sm text-yellow-400 capitalize">{{ selectedMemory.rarity }}</span>
          </div>

          <!-- 分类 -->
          <div class="flex items-center space-x-2">
            <span class="text-gray-400">分类:</span>
            <span class="text-purple-400">{{ getCategoryName(selectedMemory.category) }}</span>
          </div>

          <!-- 描述 -->
          <div>
            <div class="text-gray-400 mb-2">描述:</div>
            <div class="text-gray-200 text-sm leading-relaxed">
              {{ selectedMemory.description }}
            </div>
          </div>

          <!-- 内容 -->
          <div v-if="selectedMemory.unlocked">
            <div class="text-gray-400 mb-2">记忆内容:</div>
            <div class="bg-gray-700/50 rounded-lg p-3 text-gray-200 text-sm leading-relaxed">
              {{ selectedMemory.content }}
            </div>
          </div>

          <!-- 解锁条件 -->
          <div v-else>
            <div class="text-gray-400 mb-2">解锁条件:</div>
            <div class="bg-gray-700/50 rounded-lg p-3 text-gray-300 text-sm">
              {{ getUnlockHint(selectedMemory) }}
            </div>
          </div>

          <!-- 解锁时间 -->
          <div v-if="selectedMemory.unlocked && selectedMemory.unlockedAt">
            <div class="text-gray-400 mb-1">解锁时间:</div>
            <div class="text-gray-300 text-sm">
              {{ formatUnlockTime(selectedMemory.unlockedAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  BookOpen, Star, X, Heart, Zap, Shield, Crown, Gem, 
  Flame, Snowflake, Sun, Moon, Eye
} from 'lucide-vue-next'

interface MemoryFragment {
  id: string
  fragmentId: string
  category: string
  title: string
  content: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
  unlockedAt?: Date
  justUnlocked?: boolean
}

interface Category {
  id: string
  name: string
  icon: any
  description: string
}

interface Props {
  memories: MemoryFragment[]
}

const props = defineProps<Props>()

const selectedCategory = ref('all')
const selectedMemory = ref<MemoryFragment | null>(null)

const categories: Category[] = [
  { id: 'all', name: '全部', icon: BookOpen, description: '所有记忆片段' },
  { id: 'A', name: '善恶起源', icon: Eye, description: '关于善恶本质的记忆' },
  { id: 'B', name: '诱惑抗争', icon: Flame, description: '诱惑与抗争的记忆' },
  { id: 'C', name: '救赎成长', icon: Sun, description: '救赎与成长的记忆' },
  { id: 'D', name: '智慧理解', icon: Crown, description: '智慧与理解的记忆' },
  { id: 'E', name: '超越升华', icon: Gem, description: '超越与升华的记忆' }
]

const totalCount = computed(() => props.memories.length)
const unlockedCount = computed(() => props.memories.filter(m => m.unlocked).length)
const completionPercentage = computed(() => 
  totalCount.value > 0 ? Math.round((unlockedCount.value / totalCount.value) * 100) : 0
)

const filteredMemories = computed(() => {
  if (selectedCategory.value === 'all') {
    return props.memories
  }
  return props.memories.filter(m => m.category === selectedCategory.value)
})

const getCategoryCount = (categoryId: string) => {
  if (categoryId === 'all') return unlockedCount.value
  return props.memories.filter(m => m.category === categoryId && m.unlocked).length
}

const getCategoryName = (categoryId: string) => {
  const category = categories.find(c => c.id === categoryId)
  return category?.name || '未知分类'
}

const getRarityStars = (rarity: string) => {
  const stars = {
    'common': 1,
    'rare': 2,
    'epic': 3,
    'legendary': 4
  }
  return stars[rarity as keyof typeof stars] || 1
}

const getCardStyle = (memory: MemoryFragment) => {
  if (!memory.unlocked) {
    return 'bg-gray-800 border border-gray-600 opacity-60'
  }
  
  const rarityStyles = {
    'common': 'bg-gray-700 border border-gray-500 hover:border-gray-400',
    'rare': 'bg-blue-900/30 border border-blue-500/50 hover:border-blue-400',
    'epic': 'bg-purple-900/30 border border-purple-500/50 hover:border-purple-400',
    'legendary': 'bg-yellow-900/30 border border-yellow-500/50 hover:border-yellow-400'
  }
  
  return rarityStyles[memory.rarity] || rarityStyles.common
}

const getCardGradient = (memory: MemoryFragment) => {
  if (!memory.unlocked) return 'from-gray-600 to-gray-700'
  
  const gradients = {
    'common': 'from-gray-500 to-gray-600',
    'rare': 'from-blue-500 to-blue-600',
    'epic': 'from-purple-500 to-purple-600',
    'legendary': 'from-yellow-500 to-orange-500'
  }
  
  return gradients[memory.rarity] || gradients.common
}

const getIconStyle = (memory: MemoryFragment) => {
  const styles = {
    'A': 'bg-gradient-to-r from-gray-600 to-gray-700',
    'B': 'bg-gradient-to-r from-red-600 to-orange-600',
    'C': 'bg-gradient-to-r from-green-600 to-blue-600',
    'D': 'bg-gradient-to-r from-purple-600 to-indigo-600',
    'E': 'bg-gradient-to-r from-yellow-600 to-pink-600'
  }
  
  return styles[memory.category as keyof typeof styles] || styles.A
}

const getMemoryIcon = (memory: MemoryFragment) => {
  const icons = {
    'A': Eye,
    'B': Flame,
    'C': Sun,
    'D': Crown,
    'E': Gem
  }
  
  return icons[memory.category as keyof typeof icons] || Eye
}

const getUnlockHint = (memory: MemoryFragment) => {
  // 这里可以根据实际的解锁条件返回提示
  const hints = {
    'A': '通过深入的道德思考来解锁',
    'B': '在诱惑与抗争中做出选择',
    'C': '展现救赎与成长的意愿',
    'D': '获得足够的智慧与理解',
    'E': '达到超越与升华的境界'
  }
  
  return hints[memory.category as keyof typeof hints] || '继续对话以解锁更多记忆'
}

const formatUnlockTime = (date: Date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const selectMemory = (memory: MemoryFragment) => {
  selectedMemory.value = memory
}
</script>

<style scoped>
.memory-card {
  transition: all 0.3s ease;
  transform-style: preserve-3d;
}

.memory-card:hover {
  transform: translateY(-4px) scale(1.02);
}

.memory-card.unlocked {
  animation: card-glow 2s ease-in-out infinite alternate;
}

@keyframes card-glow {
  0% {
    box-shadow: 0 0 5px rgba(168, 85, 247, 0.3);
  }
  100% {
    box-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
  }
}

.memory-card.just-unlocked {
  animation: unlock-celebration 1s ease-out;
}

@keyframes unlock-celebration {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
</style>