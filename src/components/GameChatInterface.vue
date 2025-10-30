<template>
  <div class="game-chat-interface relative h-full flex flex-col">
    <!-- 背景特效 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        v-for="particle in backgroundParticles" 
        :key="particle.id"
        class="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
        :style="particle.style"
      ></div>
    </div>

    <!-- 聊天消息区域 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
      <!-- 欢迎消息 -->
      <div v-if="messages.length === 0" class="welcome-section text-center py-12">
        <div class="mb-6">
          <div class="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center mb-4">
            <Crown class="h-12 w-12 text-white" />
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">欢迎来到心灵对话</h2>
          <p class="text-gray-400">与你内心的恶魔和天使开始对话吧</p>
        </div>
        
        <!-- 快速开始选项 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <button
            v-for="starter in quickStarters"
            :key="starter.id"
            @click="sendQuickMessage(starter.message)"
            class="p-4 bg-gray-800/50 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-all duration-200 text-left group"
          >
            <div class="flex items-center space-x-3 mb-2">
              <component :is="starter.icon" class="h-5 w-5 text-purple-400" />
              <span class="font-medium text-white">{{ starter.title }}</span>
            </div>
            <p class="text-sm text-gray-400 group-hover:text-gray-300">{{ starter.description }}</p>
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="(message, index) in messages"
        :key="message.id"
        class="message-container"
        :class="getMessageContainerClass(message)"
      >
        <!-- 用户消息 -->
        <div v-if="message.role === 'user'" class="user-message flex justify-end">
          <div class="max-w-xs lg:max-w-md">
            <div class="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg">
              <p class="text-sm">{{ message.content }}</p>
            </div>
            <div class="text-xs text-gray-400 mt-1 text-right">
              {{ formatTime(message.timestamp) }}
            </div>
          </div>
        </div>

        <!-- AI消息 -->
        <div v-else class="ai-message flex items-start space-x-3">
          <!-- 角色头像 -->
          <div class="flex-shrink-0">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center relative overflow-hidden"
              :class="getAvatarClass(message.personality)"
            >
              <!-- 头像背景动画 -->
              <div class="absolute inset-0 bg-gradient-to-r opacity-20 animate-pulse"
                   :class="getAvatarGradient(message.personality)"></div>
              
              <!-- 头像图标 -->
              <component 
                :is="getPersonalityIcon(message.personality)" 
                class="h-6 w-6 text-white relative z-10"
              />
              
              <!-- 状态指示器 -->
              <div v-if="message.isTyping" 
                   class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
            </div>
          </div>

          <!-- 消息内容 -->
          <div class="flex-1 max-w-xs lg:max-w-md">
            <!-- 角色名称 -->
            <div class="flex items-center space-x-2 mb-1">
              <span class="text-sm font-medium" :class="getPersonalityTextClass(message.personality)">
                {{ getPersonalityName(message.personality) }}
              </span>
              <div v-if="message.emotionLevel" class="flex space-x-1">
                <div 
                  v-for="i in getEmotionBars(message.emotionLevel)"
                  :key="i"
                  class="w-1 h-3 rounded-full"
                  :class="getEmotionBarClass(message.personality, i <= message.emotionLevel)"
                ></div>
              </div>
            </div>

            <!-- 消息气泡 -->
            <div 
              class="rounded-2xl rounded-tl-md px-4 py-3 shadow-lg relative overflow-hidden"
              :class="getMessageBubbleClass(message.personality)"
            >
              <!-- 气泡背景特效 -->
              <div class="absolute inset-0 opacity-10"
                   :class="getBubbleEffectClass(message.personality)"></div>
              
              <!-- 消息文本 -->
              <div class="relative z-10">
                <p v-if="!message.isTyping" class="text-sm text-white leading-relaxed">
                  {{ message.content }}
                </p>
                
                <!-- 打字动画 -->
                <div v-else class="typing-animation flex items-center space-x-1">
                  <span class="text-sm text-white">{{ typingText }}</span>
                  <div class="flex space-x-1">
                    <div 
                      v-for="i in 3" 
                      :key="i"
                      class="w-1 h-1 bg-white/60 rounded-full animate-bounce"
                      :style="{ animationDelay: `${i * 0.2}s` }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- 特殊效果标识 -->
              <div v-if="message.hasSpecialEffect" 
                   class="absolute top-2 right-2">
                <Sparkles class="h-4 w-4 text-yellow-400 animate-pulse" />
              </div>
            </div>

            <!-- 消息时间和状态 -->
            <div class="flex items-center justify-between mt-1">
              <div class="text-xs text-gray-400">
                {{ formatTime(message.timestamp) }}
              </div>
              
              <!-- 道德值变化提示 -->
              <div v-if="message.moralityChange" class="flex items-center space-x-1">
                <component 
                  :is="message.moralityChange > 0 ? TrendingUp : TrendingDown" 
                  class="h-3 w-3"
                  :class="message.moralityChange > 0 ? 'text-green-400' : 'text-red-400'"
                />
                <span class="text-xs" 
                      :class="message.moralityChange > 0 ? 'text-green-400' : 'text-red-400'">
                  {{ message.moralityChange > 0 ? '+' : '' }}{{ message.moralityChange }}
                </span>
              </div>
            </div>

            <!-- 记忆解锁通知 -->
            <div v-if="message.unlockedMemory" 
                 class="mt-2 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
              <div class="flex items-center space-x-2">
                <Unlock class="h-4 w-4 text-yellow-400" />
                <span class="text-sm text-yellow-400 font-medium">解锁新记忆</span>
              </div>
              <p class="text-xs text-yellow-300 mt-1">{{ message.unlockedMemory.title }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载指示器 -->
      <div v-if="isLoading" class="flex justify-center py-4">
        <div class="flex items-center space-x-2 text-gray-400">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
          <span class="text-sm">AI正在思考...</span>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="border-t border-gray-700 p-4 bg-gray-900/50 backdrop-blur-sm">
      <div class="flex items-end space-x-3">
        <!-- 输入框 -->
        <div class="flex-1 relative">
          <textarea
            v-model="inputMessage"
            @keydown.enter.prevent="handleEnterKey"
            @input="handleInput"
            placeholder="输入你的想法..."
            class="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-500 transition-colors duration-200"
            rows="1"
            :style="{ height: textareaHeight }"
          ></textarea>
          
          <!-- 字符计数 -->
          <div class="absolute bottom-2 right-2 text-xs text-gray-500">
            {{ inputMessage.length }}/500
          </div>
        </div>

        <!-- 发送按钮 -->
        <button
          @click="sendMessage"
          :disabled="!inputMessage.trim() || isLoading"
          class="flex-shrink-0 w-12 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors duration-200"
        >
          <Send class="h-5 w-5 text-white" />
        </button>

        <!-- 语音按钮 -->
        <button
          @click="toggleVoiceInput"
          :class="isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'"
          class="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200"
        >
          <Mic class="h-5 w-5 text-white" />
        </button>
      </div>

      <!-- 快捷回复 -->
      <div v-if="quickReplies.length > 0" class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="reply in quickReplies"
          :key="reply.id"
          @click="sendQuickMessage(reply.text)"
          class="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-full transition-colors duration-200"
        >
          {{ reply.text }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { 
  Crown, Heart, Flame, Send, Mic, Sparkles, Unlock, 
  TrendingUp, TrendingDown, MessageCircle, Lightbulb, 
  HelpCircle, Coffee
} from 'lucide-vue-next'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  personality?: 'demon' | 'angel' | 'neutral'
  timestamp: Date | string
  isTyping?: boolean
  emotionLevel?: number
  moralityChange?: number
  hasSpecialEffect?: boolean
  unlockedMemory?: {
    id: string
    title: string
  }
}

interface QuickStarter {
  id: string
  title: string
  description: string
  message: string
  icon: any
}

interface QuickReply {
  id: string
  text: string
}

interface Props {
  messages: Message[]
  isLoading?: boolean
  currentPersonality?: 'demon' | 'angel' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  currentPersonality: 'neutral'
})

const emit = defineEmits<{
  sendMessage: [message: string]
  voiceInput: [isRecording: boolean]
}>()

const inputMessage = ref('')
const isRecording = ref(false)
const typingText = ref('正在思考')
const textareaHeight = ref('auto')
const backgroundParticles = ref<Array<{ id: number, style: any }>>([])

const quickStarters: QuickStarter[] = [
  {
    id: '1',
    title: '开始对话',
    description: '与你的内心开始一段深度对话',
    message: '你好，我想和你聊聊我最近的想法',
    icon: MessageCircle
  },
  {
    id: '2',
    title: '寻求建议',
    description: '在人生的十字路口寻求指引',
    message: '我遇到了一个困难的选择，需要你的建议',
    icon: Lightbulb
  },
  {
    id: '3',
    title: '探索内心',
    description: '深入了解自己的内心世界',
    message: '我想更好地了解自己的内心',
    icon: HelpCircle
  },
  {
    id: '4',
    title: '日常分享',
    description: '分享今天发生的有趣事情',
    message: '今天发生了一些有趣的事情，想和你分享',
    icon: Coffee
  }
]

const quickReplies = computed<QuickReply[]>(() => {
  // 根据当前对话上下文生成快捷回复
  if (props.messages.length === 0) return []
  
  const lastMessage = props.messages[props.messages.length - 1]
  if (lastMessage.role === 'user') return []
  
  return [
    { id: '1', text: '继续说' },
    { id: '2', text: '我明白了' },
    { id: '3', text: '告诉我更多' },
    { id: '4', text: '我有不同看法' }
  ]
})

// 生成背景粒子
const generateBackgroundParticles = () => {
  backgroundParticles.value = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    style: {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${3 + Math.random() * 4}s`
    }
  }))
}

const getMessageContainerClass = (message: Message) => {
  return message.role === 'user' ? 'user-message-container' : 'ai-message-container'
}

const getAvatarClass = (personality: string) => {
  const classes = {
    'demon': 'bg-gradient-to-r from-red-600 to-orange-600 shadow-lg shadow-red-500/30',
    'angel': 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30',
    'neutral': 'bg-gradient-to-r from-gray-600 to-gray-700 shadow-lg shadow-gray-500/30'
  }
  return classes[personality as keyof typeof classes] || classes.neutral
}

const getAvatarGradient = (personality: string) => {
  const gradients = {
    'demon': 'from-red-400 to-orange-400',
    'angel': 'from-blue-400 to-purple-400',
    'neutral': 'from-gray-400 to-gray-500'
  }
  return gradients[personality as keyof typeof gradients] || gradients.neutral
}

const getPersonalityIcon = (personality: string) => {
  const icons = {
    'demon': Flame,
    'angel': Heart,
    'neutral': Crown
  }
  return icons[personality as keyof typeof icons] || icons.neutral
}

const getPersonalityName = (personality: string) => {
  const names = {
    'demon': '恶魔',
    'angel': '天使',
    'neutral': '中性'
  }
  return names[personality as keyof typeof names] || '未知'
}

const getPersonalityTextClass = (personality: string) => {
  const classes = {
    'demon': 'text-red-400',
    'angel': 'text-blue-400',
    'neutral': 'text-gray-400'
  }
  return classes[personality as keyof typeof classes] || classes.neutral
}

const getMessageBubbleClass = (personality: string) => {
  const classes = {
    'demon': 'bg-gradient-to-r from-red-700 to-orange-700 border border-red-500/30',
    'angel': 'bg-gradient-to-r from-blue-700 to-purple-700 border border-blue-500/30',
    'neutral': 'bg-gradient-to-r from-gray-700 to-gray-800 border border-gray-500/30'
  }
  return classes[personality as keyof typeof classes] || classes.neutral
}

const getBubbleEffectClass = (personality: string) => {
  const effects = {
    'demon': 'bg-gradient-to-r from-red-400 to-orange-400 animate-pulse',
    'angel': 'bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse',
    'neutral': 'bg-gradient-to-r from-gray-400 to-gray-500'
  }
  return effects[personality as keyof typeof effects] || effects.neutral
}

const getEmotionBars = (level: number) => {
  return Math.min(Math.max(level, 1), 5)
}

const getEmotionBarClass = (personality: string, isActive: boolean) => {
  if (!isActive) return 'bg-gray-600'
  
  const classes = {
    'demon': 'bg-red-400',
    'angel': 'bg-blue-400',
    'neutral': 'bg-gray-400'
  }
  return classes[personality as keyof typeof classes] || classes.neutral
}

const formatTime = (date: Date | string) => {
  // 如果是字符串，转换为 Date 对象
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // 检查是否是有效的 Date 对象
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '无效时间'
  }
  
  return dateObj.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleInput = () => {
  // 自动调整文本框高度
  nextTick(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  })
}

const handleEnterKey = (event: KeyboardEvent) => {
  if (!event.shiftKey) {
    sendMessage()
  }
}

const sendMessage = () => {
  if (inputMessage.value.trim() && !props.isLoading) {
    emit('sendMessage', inputMessage.value.trim())
    inputMessage.value = ''
    textareaHeight.value = 'auto'
  }
}

const sendQuickMessage = (message: string) => {
  emit('sendMessage', message)
}

const toggleVoiceInput = () => {
  isRecording.value = !isRecording.value
  emit('voiceInput', isRecording.value)
}

// 打字动画效果
const startTypingAnimation = () => {
  const texts = ['正在思考', '正在思考.', '正在思考..', '正在思考...']
  let index = 0
  
  const interval = setInterval(() => {
    typingText.value = texts[index]
    index = (index + 1) % texts.length
  }, 500)
  
  return interval
}

onMounted(() => {
  generateBackgroundParticles()
})

// 监听消息变化，自动滚动到底部
watch(() => props.messages.length, () => {
  nextTick(() => {
    const chatContainer = document.querySelector('.game-chat-interface .overflow-y-auto')
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight
    }
  })
})
</script>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.message-container {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.typing-animation .animate-bounce:nth-child(1) {
  animation-delay: 0s;
}

.typing-animation .animate-bounce:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-animation .animate-bounce:nth-child(3) {
  animation-delay: 0.4s;
}

.welcome-section {
  animation: fadeIn 1s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>