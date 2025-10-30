<template>
  <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
    <div class="flex items-center justify-between">
      <!-- 左侧：当前人格和状态 -->
      <div class="flex items-center space-x-4">
        <!-- 人格指示器 -->
        <div class="flex items-center space-x-3">
          <div class="relative">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
              :class="getPersonalityAvatarStyle(currentPersonality)"
            >
              <component :is="getPersonalityIcon(currentPersonality)" class="h-5 w-5" />
            </div>
            <!-- 在线状态指示器 -->
            <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-800 animate-pulse" />
          </div>
          
          <div>
            <h2 class="text-white font-medium text-lg">
              {{ getPersonalityName(currentPersonality) }}
            </h2>
            <p class="text-gray-400 text-sm">
              {{ getPersonalityDescription(currentPersonality) }}
            </p>
          </div>
        </div>

        <!-- 人格切换按钮 -->
        <button
          @click="showPersonalitySelector = !showPersonalitySelector"
          class="p-2 hover:bg-gray-700 rounded-lg transition-colors group relative"
          title="切换人格模式"
        >
          <Shuffle class="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
          
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
                :class="getPersonalityAvatarStyle(personality.key)"
              >
                <component :is="getPersonalityIcon(personality.key)" class="h-3 w-3" />
              </div>
              <div>
                <div class="text-white text-sm font-medium">{{ personality.name }}</div>
                <div class="text-gray-400 text-xs">{{ personality.description }}</div>
              </div>
            </div>
          </div>
        </button>
      </div>

      <!-- 右侧：功能按钮 -->
      <div class="flex items-center space-x-2">
        <!-- 记忆片段按钮 -->
        <button
          @click="$emit('toggleMemory')"
          class="relative p-2 hover:bg-gray-700 rounded-lg transition-colors group"
          title="记忆片段"
        >
          <Brain class="h-5 w-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
          <!-- 记忆数量徽章 -->
          <span
            v-if="memoryCount > 0"
            class="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium"
          >
            {{ memoryCount > 99 ? '99+' : memoryCount }}
          </span>
        </button>

        <!-- 语音开关 -->
        <button
          @click="toggleTTS"
          class="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
          :title="ttsEnabled ? '关闭语音' : '开启语音'"
        >
          <Volume2 v-if="ttsEnabled" class="h-5 w-5 text-green-400 group-hover:text-green-300 transition-colors" />
          <VolumeX v-else class="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
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
            @click="showUserMenu = !showUserMenu"
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

    <!-- 人格切换提示 -->
    <div
      v-if="personalityChangeNotification"
      class="mt-3 p-3 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center space-x-3 animate-fade-in"
    >
      <Sparkles class="h-5 w-5 text-blue-400" />
      <div class="flex-1">
        <div class="text-blue-300 text-sm font-medium">
          人格模式已切换
        </div>
        <div class="text-blue-400 text-xs">
          {{ personalityChangeNotification.message }}
        </div>
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
  Brain,
  Volume2,
  VolumeX,
  Settings,
  User,
  UserCircle,
  Download,
  LogOut,
  ChevronDown,
  Shuffle,
  Sparkles,
  X,
  Heart,
  Zap,
  Shield,
  Cpu
} from 'lucide-vue-next'

// Props
const props = defineProps<{
  currentPersonality: string
  memoryCount: number
}>()

// Emits
const emit = defineEmits<{
  toggleMemory: []
  toggleSettings: []
  logout: []
  personalityChange: [personality: string]
}>()

// 响应式数据
const showPersonalitySelector = ref(false)
const showUserMenu = ref(false)
const ttsEnabled = ref(true)
const personalityChangeNotification = ref<{
  message: string
  type: string
} | null>(null)

// 人格选项
const personalityOptions = [
  {
    key: 'default',
    name: '默认痞帅',
    description: '冷静理性，略带痞气',
    icon: 'User'
  },
  {
    key: 'tsundere',
    name: '傲娇模式',
    description: '外冷内热，口是心非',
    icon: 'Heart'
  },
  {
    key: 'tech',
    name: '科技高冷',
    description: '理性分析，科技范儿',
    icon: 'Cpu'
  },
  {
    key: 'healing',
    name: '治愈暖心',
    description: '温暖治愈，贴心陪伴',
    icon: 'Heart'
  },
  {
    key: 'defensive',
    name: '防御模式',
    description: '保护自我，谨慎应对',
    icon: 'Shield'
  }
]

// 计算属性
const currentPersonalityOption = computed(() =>
  personalityOptions.find(p => p.key === props.currentPersonality) || personalityOptions[0]
)

// 方法
const getPersonalityName = (personality: string): string => {
  const option = personalityOptions.find(p => p.key === personality)
  return option?.name || '默认痞帅'
}

const getPersonalityDescription = (personality: string): string => {
  const option = personalityOptions.find(p => p.key === personality)
  return option?.description || '冷静理性，略带痞气'
}

const getPersonalityIcon = (personality: string) => {
  const iconMap: { [key: string]: any } = {
    default: User,
    tsundere: Heart,
    tech: Cpu,
    healing: Heart,
    defensive: Shield
  }
  return iconMap[personality] || User
}

const getPersonalityAvatarStyle = (personality: string): string => {
  const styleMap: { [key: string]: string } = {
    default: 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/30',
    tsundere: 'bg-pink-500/20 text-pink-400 border-2 border-pink-500/30',
    tech: 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/30',
    healing: 'bg-green-500/20 text-green-400 border-2 border-green-500/30',
    defensive: 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/30'
  }
  return styleMap[personality] || styleMap.default
}

const selectPersonality = (personality: string) => {
  if (personality !== props.currentPersonality) {
    emit('personalityChange', personality)
    
    // 显示切换通知
    personalityChangeNotification.value = {
      message: `已切换到${getPersonalityName(personality)}模式`,
      type: 'success'
    }
    
    // 3秒后自动隐藏通知
    setTimeout(() => {
      personalityChangeNotification.value = null
    }, 3000)
  }
  
  showPersonalitySelector.value = false
}

const toggleTTS = () => {
  ttsEnabled.value = !ttsEnabled.value
  // 这里可以触发全局TTS设置更新
}

const handleProfile = () => {
  showUserMenu.value = false
  // 处理个人资料逻辑
  console.log('打开个人资料')
}

const handleExport = () => {
  showUserMenu.value = false
  // 处理数据导出逻辑
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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* 动画效果 */
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

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

/* 下拉菜单动画 */
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

/* 人格指示器脉冲效果 */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 悬停效果 */
button:hover {
  transform: translateY(-1px);
}

/* 徽章动画 */
.absolute.-top-1.-right-1 {
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -5px, 0);
  }
  70% {
    transform: translate3d(0, -3px, 0);
  }
  90% {
    transform: translate3d(0, -1px, 0);
  }
}

/* 人格切换按钮特效 */
.group:hover .h-5.w-5 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}
</style>