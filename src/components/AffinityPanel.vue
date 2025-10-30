<template>
  <div class="w-96 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
    <!-- 头部 -->
    <div class="p-4 border-b border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-white flex items-center">
          <Heart class="h-6 w-6 mr-2 text-pink-400" />
          好感度系统
        </h2>
        <button
          @click="$emit('close')"
          class="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="关闭面板"
        >
          <X class="h-5 w-5 text-gray-400" />
        </button>
      </div>
    </div>

    <!-- 好感度显示 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400"></div>
      </div>

      <!-- 好感度数据 -->
      <div v-else-if="affinityData" class="space-y-6">
        <!-- 双人格好感度 -->
        <div class="space-y-4">
          <!-- 天使好感度 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-blue-400 rounded-full mr-2"></div>
                <span class="text-sm font-medium text-blue-400">天使人格</span>
              </div>
              <span class="text-lg font-bold text-white">{{ affinityData.angel_affinity }}</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-3">
              <div
                class="bg-gradient-to-r from-blue-400 to-cyan-400 h-3 rounded-full transition-all duration-500"
                :style="{ width: `${getAffinityPercentage(affinityData.angel_affinity)}%` }"
              />
            </div>
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>冷漠</span>
              <span>{{ getAffinityLevel(affinityData.angel_affinity) }}</span>
              <span>深爱</span>
            </div>
          </div>

          <!-- 恶魔好感度 -->
          <div class="bg-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center">
                <div class="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                <span class="text-sm font-medium text-red-400">恶魔人格</span>
              </div>
              <span class="text-lg font-bold text-white">{{ affinityData.demon_affinity }}</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-3">
              <div
                class="bg-gradient-to-r from-red-400 to-pink-400 h-3 rounded-full transition-all duration-500"
                :style="{ width: `${getAffinityPercentage(affinityData.demon_affinity)}%` }"
              />
            </div>
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>冷漠</span>
              <span>{{ getAffinityLevel(affinityData.demon_affinity) }}</span>
              <span>深爱</span>
            </div>
          </div>
        </div>

        <!-- 道德值显示 -->
        <div class="bg-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-gray-300">道德倾向</span>
            <span class="text-lg font-bold text-white">{{ affinityData.morality_value }}</span>
          </div>
          <div class="relative w-full bg-gray-600 rounded-full h-3">
            <div
              class="absolute h-3 rounded-full transition-all duration-500"
              :class="getMoralityGradient(affinityData.morality_value)"
              :style="{ width: `${getMoralityPercentage(affinityData.morality_value)}%` }"
            />
          </div>
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>邪恶</span>
            <span>{{ getMoralityLabel(affinityData.morality_value) }}</span>
            <span>善良</span>
          </div>
        </div>

        <!-- 平衡状态 -->
        <div class="bg-gray-700 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-300">人格平衡</span>
            <div class="flex items-center">
              <Scale class="h-4 w-4 mr-1 text-purple-400" />
              <span class="text-sm font-medium text-purple-400">{{ affinityData.balance_status }}</span>
            </div>
          </div>
          <p class="text-xs text-gray-400">
            {{ getBalanceDescription(affinityData.balance_status) }}
          </p>
        </div>

        <!-- 统计信息 -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-gray-700 rounded-lg p-3 text-center">
            <div class="text-lg font-bold text-blue-400">{{ affinityData.angel_choices }}</div>
            <div class="text-xs text-gray-400">天使选择</div>
          </div>
          <div class="bg-gray-700 rounded-lg p-3 text-center">
            <div class="text-lg font-bold text-red-400">{{ affinityData.demon_choices }}</div>
            <div class="text-xs text-gray-400">恶魔选择</div>
          </div>
        </div>

        <!-- 选择历史 -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-300">最近选择</h3>
            <button
              @click="loadChoiceHistory"
              class="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              刷新
            </button>
          </div>
          
          <div v-if="choiceHistory.length === 0" class="text-center py-4">
            <History class="h-8 w-8 mx-auto mb-2 text-gray-500" />
            <p class="text-xs text-gray-500">暂无选择记录</p>
          </div>
          
          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="choice in choiceHistory"
              :key="choice.id"
              class="bg-gray-700 rounded-lg p-3 text-xs"
            >
              <div class="flex items-center justify-between mb-1">
                <span
                  class="px-2 py-1 rounded text-xs font-medium"
                  :class="getChoiceTypeStyle(choice.choice_type)"
                >
                  {{ getChoiceTypeLabel(choice.choice_type) }}
                </span>
                <span class="text-gray-400">
                  {{ formatDate(choice.created_at) }}
                </span>
              </div>
              <p class="text-gray-300 line-clamp-2">{{ choice.choice_content }}</p>
              <div class="flex items-center justify-between mt-2">
                <span class="text-gray-400">好感度变化:</span>
                <span
                  class="font-medium"
                  :class="choice.affinity_change > 0 ? 'text-green-400' : choice.affinity_change < 0 ? 'text-red-400' : 'text-gray-400'"
                >
                  {{ choice.affinity_change > 0 ? '+' : '' }}{{ choice.affinity_change }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-else class="text-center py-8">
        <AlertCircle class="h-12 w-12 mx-auto mb-2 text-red-400" />
        <p class="text-sm text-gray-400">加载好感度数据失败</p>
        <button
          @click="loadAffinityData"
          class="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Heart, X, Scale, History, AlertCircle } from 'lucide-vue-next'
import { apiClient } from '@/utils/api'

// 定义事件
defineEmits<{
  close: []
}>()

// 响应式数据
const isLoading = ref(true)
const affinityData = ref<any>(null)
const choiceHistory = ref<any[]>([])

// 计算属性
const getAffinityPercentage = (value: number) => {
  return Math.max(0, Math.min(100, ((value + 100) / 200) * 100))
}

const getAffinityLevel = (value: number) => {
  if (value >= 80) return '深爱'
  if (value >= 60) return '喜欢'
  if (value >= 40) return '好感'
  if (value >= 20) return '普通'
  if (value >= 0) return '冷淡'
  if (value >= -20) return '不喜'
  if (value >= -40) return '厌恶'
  if (value >= -60) return '憎恨'
  return '仇视'
}

const getMoralityPercentage = (value: number) => {
  return Math.max(0, Math.min(100, ((value + 100) / 200) * 100))
}

const getMoralityGradient = (value: number) => {
  if (value > 20) return 'bg-gradient-to-r from-blue-400 to-cyan-400'
  if (value < -20) return 'bg-gradient-to-r from-red-400 to-pink-400'
  return 'bg-gradient-to-r from-gray-400 to-gray-500'
}

const getMoralityLabel = (value: number) => {
  if (value >= 60) return '圣洁'
  if (value >= 40) return '善良'
  if (value >= 20) return '正义'
  if (value >= -20) return '中性'
  if (value >= -40) return '邪恶'
  if (value >= -60) return '堕落'
  return '黑暗'
}

const getBalanceDescription = (status: string) => {
  const descriptions = {
    '平衡': '两种人格保持良好平衡',
    '天使倾向': '更倾向于天使人格',
    '恶魔倾向': '更倾向于恶魔人格',
    '极度失衡': '人格严重失衡，需要调整'
  }
  return descriptions[status] || '状态未知'
}

const getChoiceTypeStyle = (type: string) => {
  const styles = {
    'angel': 'bg-blue-500 text-white',
    'demon': 'bg-red-500 text-white',
    'neutral': 'bg-gray-500 text-white'
  }
  return styles[type] || 'bg-gray-500 text-white'
}

const getChoiceTypeLabel = (type: string) => {
  const labels = {
    'angel': '天使',
    'demon': '恶魔',
    'neutral': '中性'
  }
  return labels[type] || '未知'
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

// 方法
const loadAffinityData = async () => {
  try {
    isLoading.value = true
    const response = await apiClient.get('/affinity')
    if (response.success) {
      affinityData.value = response.data
    }
  } catch (error) {
    console.error('加载好感度数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

const loadChoiceHistory = async () => {
  try {
    const response = await apiClient.get('/affinity/history?limit=10')
    if (response.success) {
      choiceHistory.value = response.data
    }
  } catch (error) {
    console.error('加载选择历史失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadAffinityData()
  loadChoiceHistory()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>