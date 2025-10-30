<template>
  <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
    <div class="flex items-center justify-between">
      <!-- 左侧：当前人格状态 -->
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-3">
          <!-- 人格头像 -->
          <div class="relative">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
              :class="personalityStyle"
            >
              <component :is="personalityIcon" class="h-5 w-5" />
            </div>
            <!-- 在线状态 -->
            <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-800 animate-pulse" />
          </div>
          
          <!-- 人格信息 -->
          <div>
            <div class="flex items-center space-x-2">
              <h2 class="text-white font-medium text-lg">{{ personalityName }}</h2>
              <!-- 星级评分 -->
              <div class="flex items-center space-x-1">
                <span v-for="i in 5" :key="i" class="text-sm">
                  <span 
                    v-if="i <= favorabilityLevel" 
                    class="text-yellow-400"
                  >★</span>
                  <span 
                    v-else 
                    class="text-gray-500"
                  >☆</span>
                </span>
              </div>
            </div>
            <p class="text-gray-400 text-sm">{{ personalityDescription }}</p>
          </div>
        </div>

        <!-- 人格切换按钮 -->
        <div class="relative">
          <button
            @click="togglePersonalitySelector"
            class="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
            title="切换人格模式"
          >
            <Shuffle class="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
          </button>
          
          <!-- 人格选择器 -->
          <div
            v-if="showPersonalitySelector"
            class="absolute top-full left-0 mt-2 bg-gray-700 rounded-lg shadow-xl border border-gray-600 py-2 z-50 min-w-48"
            @click.stop
          >
            <div
              v-for="personality in personalityOptions"
              :key="personality.key"
              @click="selectPersonality(personality.key)"
              class="px-4 py-2 hover:bg-gray-600 cursor-pointer flex items-center space-x-3 transition-colors"
              :class="{ 'bg-gray-600': personality.key === currentPersonality }"
            >
              <div
                class="w-6 h-6 rounded-full flex items-center justify-center"
                :class="getPersonalityStyle(personality.key)"
              >
                <component :is="getPersonalityIcon(personality.key)" class="h-3 w-3" />
              </div>
              <div>
                <div class="text-white text-sm font-medium">{{ personality.name }}</div>
                <div class="text-gray-400 text-xs">{{ personality.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：功能按钮 -->
      <div class="flex items-center space-x-2">
        <!-- 好感度按钮 -->
        <button
          @click="$emit('toggleAffinity')"
          class="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
          title="好感度系统"
        >
          <Heart class="h-5 w-5 text-gray-400 group-hover:text-pink-400 transition-colors" />
        </button>

        <!-- 记忆片段按钮 -->
        <button
          @click="$emit('toggleMemory')"
          class="relative p-2 hover:bg-gray-700 rounded-lg transition-colors group"
          title="记忆片段"
        >
          <Brain class="h-5 w-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
          <span
            v-if="memoryCount > 0"
            class="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium"
          >
            {{ memoryCount > 99 ? '99+' : memoryCount }}
          </span>
        </button>

        <!-- 设置按钮 -->
        <button
          @click="$emit('toggleSettings')"
          class="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
          title="设置"
        >
          <Settings class="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
        </button>

        <!-- 用户菜单 -->
        <div class="relative">
          <button
            @click="toggleUserMenu"
            class="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User class="h-4 w-4 text-white" />
            </div>
            <ChevronDown class="h-4 w-4 text-gray-400" />
          </button>

          <!-- 用户菜单下拉 -->
          <div
            v-if="showUserMenu"
            class="absolute top-full right-0 mt-2 bg-gray-700 rounded-lg shadow-xl border border-gray-600 py-2 z-50 min-w-40"
            @click.stop
          >
            <div class="px-4 py-2 border-b border-gray-600">
              <div class="text-white text-sm font-medium">用户中心</div>
              <div class="text-gray-400 text-xs">管理你的账户</div>
            </div>
            
            <button
              @click="handleProfile"
              class="w-full px-4 py-2 text-left hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <UserCircle class="h-4 w-4 text-gray-400" />
              <span class="text-white text-sm">个人资料</span>
            </button>
            
            <button
              @click="handleExport"
              class="w-full px-4 py-2 text-left hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <Download class="h-4 w-4 text-gray-400" />
              <span class="text-white text-sm">导出数据</span>
            </button>
            
            <div class="border-t border-gray-600 mt-2 pt-2">
              <button
                @click="$emit('logout')"
                class="w-full px-4 py-2 text-left hover:bg-red-600 transition-colors flex items-center space-x-2"
              >
                <LogOut class="h-4 w-4 text-red-400" />
                <span class="text-red-400 text-sm">退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 人格切换通知 -->
    <div
      v-if="personalityChangeNotification"
      class="mt-3 p-3 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center space-x-3 animate-fade-in"
    >
      <Sparkles class="h-5 w-5 text-blue-400" />
      <div class="flex-1">
        <div class="text-blue-300 text-sm font-medium">人格模式已切换</div>
        <div class="text-blue-400 text-xs">{{ personalityChangeNotification.message }}</div>
      </div>
      <button
        @click="personalityChangeNotification = null"
        class="text-blue-400 hover:text-blue-300 transition-colors"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Brain, Settings, User, UserCircle, Download, LogOut, ChevronDown,
  Shuffle, Sparkles, X, Heart, Zap, Shield
} from 'lucide-vue-next'
import { useAffinityStore } from '@/stores/affinity'

// Props
const props = defineProps<{
  currentPersonality: string
  memoryCount: number
}>()

// Emits
const emit = defineEmits<{
  toggleAffinity: []
  toggleMemory: []
  toggleSettings: []
  logout: []
  personalityChange: [personality: string]
}>()

// Store
const affinityStore = useAffinityStore()

// 响应式数据
const showPersonalitySelector = ref(false)
const showUserMenu = ref(false)
const personalityChangeNotification = ref<{
  message: string
  type: string
} | null>(null)

// 人格配置
const personalityOptions = [
  {
    key: 'angel',
    name: '天使七崽',
    description: '纯洁善良，温暖治愈',
    icon: Heart,
    style: 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/30'
  },
  {
    key: 'demon',
    name: '恶魔七崽',
    description: '诱惑邪恶，充满魅力',
    icon: Zap,
    style: 'bg-red-500/20 text-red-400 border-2 border-red-500/30'
  }
]

// 计算属性
const currentPersonalityConfig = computed(() =>
  personalityOptions.find(p => p.key === props.currentPersonality) || personalityOptions[0]
)

const personalityName = computed(() => currentPersonalityConfig.value.name)
const personalityDescription = computed(() => currentPersonalityConfig.value.description)
const personalityIcon = computed(() => currentPersonalityConfig.value.icon)
const personalityStyle = computed(() => currentPersonalityConfig.value.style)

// 计算星级评分（基于好感度数据）
const favorabilityLevel = computed(() => {
  if (!affinityStore.affinityData) return 0
  
  // 根据当前人格类型计算好感度
  const currentAffinity = props.currentPersonality === 'angel' 
    ? affinityStore.affinityData.angel_affinity 
    : affinityStore.affinityData.demon_affinity
  
  // 将好感度（0-100）转换为星级（1-5）
  if (currentAffinity >= 90) return 5
  if (currentAffinity >= 70) return 4
  if (currentAffinity >= 50) return 3
  if (currentAffinity >= 30) return 2
  if (currentAffinity >= 10) return 1
  return 0
})

// 方法
const getPersonalityIcon = (personality: string) => {
  const config = personalityOptions.find(p => p.key === personality)
  return config?.icon || Shield
}

const getPersonalityStyle = (personality: string): string => {
  const config = personalityOptions.find(p => p.key === personality)
  return config?.style || 'bg-gray-500/20 text-gray-400 border-2 border-gray-500/30'
}

const togglePersonalitySelector = () => {
  showPersonalitySelector.value = !showPersonalitySelector.value
  showUserMenu.value = false
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
  showPersonalitySelector.value = false
}

const selectPersonality = (personality: string) => {
  if (personality !== props.currentPersonality) {
    emit('personalityChange', personality)
    
    const config = personalityOptions.find(p => p.key === personality)
    personalityChangeNotification.value = {
      message: `已切换到${config?.name || '未知'}模式`,
      type: 'success'
    }
    
    setTimeout(() => {
      personalityChangeNotification.value = null
    }, 3000)
  }
  
  showPersonalitySelector.value = false
}

const handleProfile = () => {
  showUserMenu.value = false
  console.log('打开个人资料')
}

const handleExport = () => {
  showUserMenu.value = false
  console.log('导出数据')
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.closest('.relative')) {
    showPersonalitySelector.value = false
    showUserMenu.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  // 获取好感度数据
  try {
    await affinityStore.fetchAffinityData()
  } catch (error) {
    console.error('获取好感度数据失败:', error)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.absolute {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

button:hover {
  transform: translateY(-1px);
}

.group:hover .h-5.w-5 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}
</style>