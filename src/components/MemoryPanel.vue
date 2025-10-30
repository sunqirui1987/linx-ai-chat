<template>
  <div class="w-96 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
    <!-- 头部 -->
    <div class="p-4 border-b border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-white flex items-center">
          <Brain class="h-6 w-6 mr-2 text-purple-400" />
          记忆片段
        </h2>
        <button
          @click="$emit('close')"
          class="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="关闭面板"
        >
          <X class="h-5 w-5 text-gray-400" />
        </button>
      </div>

      <!-- 进度统计 -->
      <div class="bg-gray-700 rounded-lg p-3 mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-300">解锁进度</span>
          <span class="text-sm font-medium text-purple-400">
            {{ unlockedCount }}/{{ totalCount }}
          </span>
        </div>
        <div class="w-full bg-gray-600 rounded-full h-2">
          <div
            class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
            :style="{ width: `${progressPercentage}%` }"
          />
        </div>
        <div class="text-xs text-gray-400 mt-1">
          {{ progressPercentage }}% 完成
        </div>
      </div>

      <!-- 搜索和筛选 -->
      <div class="space-y-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索记忆片段..."
            class="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
        </div>

        <div class="flex space-x-2">
          <button
            @click="filterType = 'all'"
            class="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
            :class="filterType === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
          >
            全部
          </button>
          <button
            @click="filterType = 'unlocked'"
            class="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
            :class="filterType === 'unlocked' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
          >
            已解锁
          </button>
          <button
            @click="filterType = 'locked'"
            class="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
            :class="filterType === 'locked' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
          >
            未解锁
          </button>
        </div>
      </div>
    </div>

    <!-- 记忆片段列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="filteredFragments.length === 0" class="p-4 text-center text-gray-500">
        <FileText class="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p class="text-sm">{{ getEmptyMessage() }}</p>
      </div>

      <div v-else class="p-4 space-y-3">
        <!-- 分类显示 -->
        <div v-for="(fragments, category) in groupedFragments" :key="category" class="space-y-3">
          <h3 v-if="Object.keys(groupedFragments).length > 1" class="text-sm font-medium text-gray-400 border-b border-gray-700 pb-1">
            {{ category }}
          </h3>
          
          <div
            v-for="fragment in fragments"
            :key="fragment.id"
            @click="selectFragment(fragment)"
            class="group relative p-4 rounded-lg cursor-pointer transition-all duration-200 border"
            :class="getFragmentStyle(fragment)"
          >
            <!-- 解锁状态指示器 -->
            <div class="absolute top-3 right-3">
              <div
                v-if="fragment.is_unlocked || fragment.isUnlocked"
                class="w-3 h-3 bg-green-400 rounded-full"
                title="已解锁"
              />
              <div
                v-else
                class="w-3 h-3 bg-gray-500 rounded-full"
                title="未解锁"
              />
            </div>

            <!-- 片段内容 -->
            <div class="pr-6">
              <h4 class="font-medium text-white mb-2 text-sm">
                {{ fragment.title }}
              </h4>
              
              <div v-if="fragment.is_unlocked || fragment.isUnlocked" class="space-y-2">
                <p class="text-gray-300 text-xs leading-relaxed">
                  {{ fragment.content }}
                </p>
                
                <div v-if="fragment.unlocked_at" class="flex items-center text-xs text-gray-500">
                  <Clock class="h-3 w-3 mr-1" />
                  解锁于 {{ formatTime(fragment.unlocked_at) }}
                </div>
              </div>
              
              <div v-else class="space-y-2">
                <div class="flex items-center text-xs text-gray-500">
                  <Lock class="h-3 w-3 mr-1" />
                  {{ getUnlockHint(fragment) }}
                </div>
                
                <div class="text-xs text-gray-600">
                  解锁条件：{{ fragment.unlock_condition || fragment.unlockCondition }}
                </div>
              </div>
            </div>

            <!-- 悬停效果 -->
            <div
              v-if="fragment.is_unlocked || fragment.isUnlocked"
              class="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="p-4 border-t border-gray-700 bg-gray-850">
      <div class="grid grid-cols-2 gap-4 text-center">
        <div>
          <div class="text-lg font-bold text-purple-400">{{ unlockedCount }}</div>
          <div class="text-xs text-gray-500">已解锁</div>
        </div>
        <div>
          <div class="text-lg font-bold text-gray-400">{{ totalCount - unlockedCount }}</div>
          <div class="text-xs text-gray-500">待解锁</div>
        </div>
      </div>
      
      <div v-if="recentlyUnlocked.length > 0" class="mt-3 pt-3 border-t border-gray-700">
        <div class="text-xs text-gray-400 mb-2">最近解锁</div>
        <div class="space-y-1">
          <div
            v-for="fragment in recentlyUnlocked.slice(0, 2)"
            :key="fragment.id"
            class="text-xs text-purple-300 truncate"
          >
            {{ fragment.title }}
          </div>
        </div>
      </div>
    </div>

    <!-- 记忆片段详情模态框 -->
    <div
      v-if="selectedFragment"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="selectedFragment = null"
    >
      <div
        class="bg-gray-800 rounded-lg max-w-md w-full border border-gray-700 max-h-96 overflow-y-auto"
        @click.stop
      >
        <div class="p-6">
          <!-- 头部 -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center"
                :class="selectedFragment.is_unlocked || selectedFragment.isUnlocked ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'"
              >
                <component
                  :is="selectedFragment.is_unlocked || selectedFragment.isUnlocked ? 'Unlock' : 'Lock'"
                  class="h-4 w-4"
                />
              </div>
              <h3 class="text-lg font-bold text-white">{{ selectedFragment.title }}</h3>
            </div>
            <button
              @click="selectedFragment = null"
              class="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X class="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <!-- 内容 -->
          <div class="space-y-4">
            <div v-if="selectedFragment.is_unlocked || selectedFragment.isUnlocked">
              <div class="bg-gray-700 rounded-lg p-4">
                <p class="text-gray-200 leading-relaxed">{{ selectedFragment.content }}</p>
              </div>
              
              <div v-if="selectedFragment.unlocked_at" class="flex items-center text-sm text-gray-400 mt-3">
                <Calendar class="h-4 w-4 mr-2" />
                解锁时间：{{ formatDateTime(selectedFragment.unlocked_at) }}
              </div>
            </div>
            
            <div v-else class="text-center py-6">
              <Lock class="h-12 w-12 mx-auto mb-3 text-gray-500" />
              <p class="text-gray-400 mb-2">此记忆片段尚未解锁</p>
              <p class="text-sm text-gray-500">{{ getUnlockHint(selectedFragment) }}</p>
              
              <div class="mt-4 p-3 bg-gray-700 rounded-lg">
                <div class="text-xs text-gray-400 mb-1">解锁条件</div>
                <div class="text-sm text-gray-300">{{ selectedFragment.unlock_condition || selectedFragment.unlockCondition }}</div>
              </div>
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
  Brain,
  X,
  Search,
  FileText,
  Clock,
  Lock,
  Unlock,
  Calendar
} from 'lucide-vue-next'

// 接口定义
interface MemoryFragment {
  id: number
  title: string
  content: string
  unlock_condition: string
  unlockCondition: string
  is_unlocked: boolean
  isUnlocked: boolean
  unlocked_at?: string
  created_at: string
}

// Props
const props = defineProps<{
  memoryFragments: MemoryFragment[]
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// 响应式数据
const searchQuery = ref('')
const filterType = ref<'all' | 'unlocked' | 'locked'>('all')
const selectedFragment = ref<MemoryFragment | null>(null)

// 计算属性
const unlockedCount = computed(() =>
  props.memoryFragments.filter(f => f.is_unlocked || f.isUnlocked).length
)

const totalCount = computed(() => props.memoryFragments.length)

const progressPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((unlockedCount.value / totalCount.value) * 100)
})

const filteredFragments = computed(() => {
  let fragments = props.memoryFragments

  // 按类型筛选
  if (filterType.value === 'unlocked') {
    fragments = fragments.filter(f => f.is_unlocked || f.isUnlocked)
  } else if (filterType.value === 'locked') {
    fragments = fragments.filter(f => !f.is_unlocked && !f.isUnlocked)
  }

  // 按搜索关键词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    fragments = fragments.filter(f =>
      f.title.toLowerCase().includes(query) ||
      f.content.toLowerCase().includes(query) ||
      f.unlock_condition.toLowerCase().includes(query) ||
      f.unlockCondition.toLowerCase().includes(query)
    )
  }

  return fragments
})

const groupedFragments = computed(() => {
  const groups: { [key: string]: MemoryFragment[] } = {}

  filteredFragments.value.forEach(fragment => {
    let category = '其他记忆'

    // 根据标题或内容推断分类
    if (fragment.title.includes('童年') || fragment.content.includes('小时候')) {
      category = '童年回忆'
    } else if (fragment.title.includes('学校') || fragment.content.includes('学习')) {
      category = '学习生活'
    } else if (fragment.title.includes('朋友') || fragment.content.includes('友情')) {
      category = '人际关系'
    } else if (fragment.title.includes('梦想') || fragment.content.includes('理想')) {
      category = '梦想理想'
    } else if (fragment.title.includes('秘密') || fragment.content.includes('不为人知')) {
      category = '内心秘密'
    }

    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(fragment)
  })

  // 按解锁状态排序每个分类
  Object.keys(groups).forEach(category => {
    groups[category].sort((a, b) => {
      const aUnlocked = a.is_unlocked || a.isUnlocked
      const bUnlocked = b.is_unlocked || b.isUnlocked
      
      if (aUnlocked && !bUnlocked) return -1
      if (!aUnlocked && bUnlocked) return 1
      
      // 同样状态下按时间排序
      if (aUnlocked && bUnlocked) {
        return new Date(b.unlocked_at || b.created_at).getTime() - 
               new Date(a.unlocked_at || a.created_at).getTime()
      }
      
      return 0
    })
  })

  return groups
})

const recentlyUnlocked = computed(() =>
  props.memoryFragments
    .filter(f => (f.is_unlocked || f.isUnlocked) && f.unlocked_at)
    .sort((a, b) => new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime())
    .slice(0, 3)
)

// 方法
const getFragmentStyle = (fragment: MemoryFragment): string => {
  const isUnlocked = fragment.is_unlocked || fragment.isUnlocked
  
  if (isUnlocked) {
    return 'bg-gray-700 border-purple-500/30 hover:bg-gray-650 hover:border-purple-400/50'
  } else {
    return 'bg-gray-750 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
  }
}

const getUnlockHint = (fragment: MemoryFragment): string => {
  if (fragment.is_unlocked || fragment.isUnlocked) {
    return '已解锁'
  }

  const condition = fragment.unlock_condition || fragment.unlockCondition

  if (condition.includes('对话次数')) {
    return '继续与七崽对话...'
  } else if (condition.includes('关键词')) {
    return '尝试聊聊相关话题...'
  } else if (condition.includes('情绪')) {
    return '分享你的真实感受...'
  } else if (condition.includes('时间')) {
    return '在特定时间段对话...'
  } else {
    return '满足特定条件后解锁'
  }
}

const getEmptyMessage = (): string => {
  if (searchQuery.value.trim()) {
    return '没有找到匹配的记忆片段'
  }
  
  switch (filterType.value) {
    case 'unlocked':
      return '还没有解锁任何记忆片段'
    case 'locked':
      return '所有记忆片段都已解锁'
    default:
      return '暂无记忆片段'
  }
}

const formatTime = (timeString: string): string => {
  const time = new Date(timeString)
  const now = new Date()
  const diff = now.getTime() - time.getTime()

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return time.toLocaleDateString('zh-CN')
}

const formatDateTime = (timeString: string): string => {
  const time = new Date(timeString)
  return time.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const selectFragment = (fragment: MemoryFragment) => {
  selectedFragment.value = fragment
}
</script>

<style scoped>
/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* 进度条动画 */
.bg-gradient-to-r {
  transition: width 0.5s ease-in-out;
}

/* 记忆片段卡片动画 */
.group {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 悬停效果 */
.group:hover {
  transform: translateY(-1px);
}

/* 模态框动画 */
.fixed {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.bg-gray-800 {
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 解锁状态指示器动画 */
.bg-green-400 {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* 筛选按钮动画 */
button {
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}
</style>