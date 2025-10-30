<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click="closeModal"
  >
    <div
      class="bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl border border-gray-700"
      @click.stop
    >
      <!-- 头部 -->
      <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-yellow-400">✨</span>
            <h3 class="text-lg font-bold">记忆片段解锁</h3>
          </div>
          <button
            @click="closeModal"
            class="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- 内容 -->
      <div class="p-6 space-y-4">
        <!-- 记忆标题 -->
        <div class="text-center">
          <h4 class="text-xl font-bold text-white mb-2">{{ memory?.title }}</h4>
          <div class="flex items-center justify-center space-x-2">
            <span
              class="px-3 py-1 rounded-full text-xs font-medium"
              :class="getRarityStyle(memory?.rarity)"
            >
              {{ getRarityName(memory?.rarity) }}
            </span>
            <span class="text-gray-400 text-sm">{{ memory?.category }}</span>
          </div>
        </div>

        <!-- 记忆内容 -->
        <div class="bg-gray-900 rounded-lg p-4 border border-gray-700">
          <p class="text-gray-300 leading-relaxed text-sm">
            {{ memory?.content }}
          </p>
        </div>

        <!-- 解锁条件 -->
        <div class="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
          <div class="flex items-center space-x-2 mb-2">
            <Key class="h-4 w-4 text-blue-400" />
            <span class="text-blue-300 text-sm font-medium">解锁条件</span>
          </div>
          <p class="text-blue-200 text-xs">
            {{ getUnlockDescription(memory) }}
          </p>
        </div>

        <!-- 情感价值 -->
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center space-x-2">
            <Heart class="h-4 w-4 text-red-400" />
            <span class="text-gray-400">情感价值</span>
          </div>
          <div class="flex items-center space-x-1">
            <span v-for="i in 5" :key="i" class="text-sm">
              {{ i <= (memory?.emotional_value || 0) ? '❤️' : '🤍' }}
            </span>
          </div>
        </div>

        <!-- 标签 -->
        <div v-if="memory?.tags && memory.tags.length > 0" class="space-y-2">
          <div class="text-gray-400 text-sm">相关标签</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in memory.tags"
              :key="tag"
              class="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-xs"
            >
              #{{ tag }}
            </span>
          </div>
        </div>

        <!-- 解锁时间 -->
        <div v-if="memory?.unlocked_at" class="text-center text-xs text-gray-500">
          解锁于 {{ formatTime(memory.unlocked_at) }}
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="bg-gray-900 p-4 border-t border-gray-700">
        <div class="flex space-x-3">
          <button
            @click="viewInMemoryPanel"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            查看记忆面板
          </button>
          <button
            @click="closeModal"
            class="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X, Key, Heart } from 'lucide-vue-next'

// 接口定义
interface MemoryFragment {
  id: string
  title: string
  content: string
  category: string
  rarity: 'common' | 'rare' | 'legendary'
  emotional_value?: number
  tags?: string[]
  unlocked_at?: string
  unlock_conditions?: any
}

// Props
const props = defineProps<{
  isVisible: boolean
  memory: MemoryFragment | null
}>()

// Emits
const emit = defineEmits<{
  close: []
  viewMemoryPanel: []
}>()

// 计算属性
const getRarityStyle = (rarity?: string): string => {
  const styles = {
    common: 'bg-gray-500/20 text-gray-300',
    rare: 'bg-blue-500/20 text-blue-300',
    legendary: 'bg-purple-500/20 text-purple-300'
  }
  return styles[rarity as keyof typeof styles] || styles.common
}

const getRarityName = (rarity?: string): string => {
  const names = {
    common: '普通',
    rare: '稀有',
    legendary: '传说'
  }
  return names[rarity as keyof typeof names] || '普通'
}

const getUnlockDescription = (memory: MemoryFragment | null): string => {
  if (!memory?.unlock_conditions) return '未知条件'
  
  const condition = memory.unlock_conditions
  
  switch (condition.type) {
    case 'conversation_count':
      return `进行 ${condition.value} 次对话`
    case 'keyword':
      return `在对话中提到关键词：${Array.isArray(condition.value) ? condition.value.join('、') : condition.value}`
    case 'emotion':
      return `表达 ${condition.value} 情绪`
    case 'time_gap':
      return `超过 ${condition.value} 小时未对话后重新开始`
    case 'favorability':
      return `好感度达到 ${condition.value} 级`
    default:
      return condition.description || '特殊条件'
  }
}

// 方法
const closeModal = () => {
  emit('close')
}

const viewInMemoryPanel = () => {
  emit('viewMemoryPanel')
  closeModal()
}

const formatTime = (timeString: string): string => {
  const time = new Date(timeString)
  return time.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
/* 模态框动画 */
.fixed {
  animation: fadeIn 0.3s ease-out;
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
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 渐变背景 */
.bg-gradient-to-r {
  background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
}

/* 心形图标动画 */
.text-red-400 {
  animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 按钮悬停效果 */
button:hover {
  transform: translateY(-1px);
}

/* 标签悬停效果 */
.bg-gray-700:hover {
  background-color: #4b5563;
  transform: scale(1.05);
}
</style>