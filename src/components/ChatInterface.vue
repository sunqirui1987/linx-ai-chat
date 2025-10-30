<template>
  <div class="flex-1 flex flex-col bg-gray-900">
    <!-- 消息列表区域 -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
      @scroll="handleScroll"
    >
      <!-- 欢迎消息 -->
      <div v-if="messages.length === 0" class="text-center py-12">
        <div class="max-w-md mx-auto">
          <div class="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle class="h-10 w-10 text-white" />
          </div>
          <h3 class="text-2xl font-bold text-white mb-4">
            你好！我是 {{ getPersonalityName(currentPersonality) }}
          </h3>
          <p class="text-gray-400 mb-6">
            {{ getPersonalityWelcome(currentPersonality) }}
          </p>
          <div class="grid grid-cols-1 gap-3">
            <button
              v-for="suggestion in welcomeSuggestions"
              :key="suggestion"
              @click="sendSuggestion(suggestion)"
              class="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm border border-gray-700 hover:border-gray-600"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-for="message in messages" :key="message.id" class="message-item">
        <!-- 用户消息 -->
        <div v-if="message.role === 'user'" class="flex justify-start mb-4">
          <div class="flex items-start space-x-3 max-w-xs lg:max-w-md">
            <!-- 用户头像 -->
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold"
            >
              我
            </div>

            <div class="flex-1">
              <!-- 消息内容 -->
              <div class="bg-blue-600 text-white rounded-lg px-4 py-3 shadow-lg">
                <p class="text-sm leading-relaxed">{{ message.content }}</p>
              </div>
              
              <!-- 时间戳 -->
              <div class="text-xs text-gray-500 mt-1">
                {{ formatTime(message.created_at) }}
              </div>
            </div>
          </div>
        </div>

        <!-- AI消息 -->
        <div v-else class="flex justify-end mb-4">
          <div class="max-w-xs lg:max-w-md">
            <div class="flex items-start space-x-3 flex-row-reverse">
              <!-- AI头像 -->
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold"
              >
                七崽
              </div>

              <div class="flex-1">
                <!-- 消息内容 -->
                <div class="bg-gray-800 text-white rounded-lg px-4 py-3 shadow-lg border border-gray-700">
                  <!-- 错误状态显示 -->
                  <div v-if="message.error" class="text-red-400 text-sm">
                    <div class="flex items-center space-x-2">
                      <span>⚠️</span>
                      <span>{{ message.error }}</span>
                    </div>
                    <button 
                      @click="regenerateMessage(message)"
                      class="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      重新发送
                    </button>
                  </div>
                  
                  <!-- 正常消息内容 -->
                  <div v-else>
                    <div
                      v-if="message.id === typingMessageId"
                      class="typing-animation"
                    >
                      <span v-for="(char, index) in displayedText" :key="index">{{ char }}</span>
                      <span class="typing-cursor">|</span>
                    </div>
                    <p v-else class="text-sm leading-relaxed whitespace-pre-wrap">{{ message.content }}</p>
                  </div>
                </div>

                <!-- 消息底部信息 -->
                <div class="flex items-center justify-between mt-2 flex-row-reverse">
                  <div class="flex items-center space-x-2">
                    <!-- 人格标识 -->
                    <span
                      v-if="message.personality"
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="getPersonalityBadgeStyle(message.personality)"
                    >
                      {{ getPersonalityName(message.personality) }}
                    </span>
                    
                    <!-- 时间戳 -->
                    <span class="text-xs text-gray-500">
                      {{ formatTime(message.created_at) }}
                    </span>
                  </div>

                  <!-- 操作按钮 -->
                  <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <!-- 语音播放按钮 -->
                    <button
                      v-if="message.voiceParams && !message.error"
                      @click="playMessageAudio(message)"
                      class="p-1 hover:bg-gray-700 rounded transition-colors"
                      :title="isPlayingAudio === message.id ? '停止播放' : '播放语音'"
                    >
                      <Volume2 v-if="isPlayingAudio === message.id" class="h-4 w-4 text-green-400" />
                      <VolumeX v-else class="h-4 w-4 text-gray-400" />
                    </button>

                    <!-- 复制按钮 -->
                    <button
                      v-if="!message.error"
                      @click="copyMessage(message.content)"
                      class="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="复制消息"
                    >
                      <Copy class="h-4 w-4 text-gray-400" />
                    </button>

                    <!-- 重新生成按钮 -->
                    <button
                      @click="regenerateMessage(message)"
                      class="p-1 hover:bg-gray-700 rounded transition-colors"
                      title="重新生成"
                    >
                      <RotateCcw class="h-4 w-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载指示器 -->
      <div v-if="isLoading" class="flex justify-start mb-4">
        <div class="flex items-start space-x-3 max-w-xs lg:max-w-md">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
            :class="getPersonalityAvatarStyle(currentPersonality)"
          >
            <component :is="getPersonalityIcon(currentPersonality)" class="h-4 w-4" />
          </div>
          <div class="bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 滚动到底部按钮 -->
      <button
        v-if="showScrollToBottom"
        @click="scrollToBottom"
        class="fixed bottom-24 right-8 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 z-10"
        title="滚动到底部"
      >
        <ChevronDown class="h-5 w-5" />
      </button>
    </div>

    <!-- 输入区域 -->
    <div class="border-t border-gray-700 bg-gray-800 p-4">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-end space-x-3">
          <!-- 输入框 -->
          <div class="flex-1 relative">
            <textarea
              ref="messageInput"
              v-model="inputMessage"
              @keydown="handleKeyDown"
              @input="handleInput"
              placeholder="输入消息..."
              class="w-full p-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
              :class="{ 'border-red-500': inputError }"
              :disabled="isLoading"
              rows="1"
              style="min-height: 44px; max-height: 120px;"
            />
            
            <!-- 字数统计 -->
            <div class="absolute bottom-2 right-2 text-xs text-gray-500">
              {{ inputMessage.length }}/500
            </div>
            
            <!-- 输入错误提示 -->
            <div v-if="inputError" class="absolute -top-8 left-0 text-red-400 text-xs">
              {{ inputError }}
            </div>
          </div>

          <!-- 功能按钮 -->
          <div class="flex items-center space-x-2">
            <!-- 语音开关 -->
            <button
              @click="$emit('toggleTTS')"
              class="p-3 hover:bg-gray-700 rounded-lg transition-colors"
              :title="ttsEnabled ? '关闭语音' : '开启语音'"
            >
              <Volume2 v-if="ttsEnabled" class="h-5 w-5 text-green-400" />
              <VolumeX v-else class="h-5 w-5 text-gray-400" />
            </button>

            <!-- 发送按钮 -->
            <button
              @click="sendMessage"
              :disabled="!canSend"
              class="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
              title="发送消息 (Ctrl+Enter)"
            >
              <Send class="h-5 w-5" />
            </button>
          </div>
        </div>

        <!-- 快捷回复建议 -->
        <div v-if="quickReplies.length > 0" class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="reply in quickReplies"
            :key="reply"
            @click="sendSuggestion(reply)"
            class="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full text-sm transition-colors"
          >
            {{ reply }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import {
  MessageCircle,
  Volume2,
  VolumeX,
  Copy,
  RotateCcw,
  Send,
  ChevronDown,
  User,
  Heart,
  Cpu,
  Shield
} from 'lucide-vue-next'

// 接口定义
interface ChatMessage {
  id: string
  session_id: string
  content: string
  role: 'user' | 'assistant'
  personality?: string
  voiceParams?: {
    voice: string
    emotion: string
    speed: number
    pitch: number
  }
  timestamp: string
  created_at: string
  error?: string // 添加错误信息字段
}

// Props
const props = defineProps<{
  messages: ChatMessage[]
  isLoading: boolean
  currentPersonality: string
}>()

// Emits
const emit = defineEmits<{
  sendMessage: [content: string]
  toggleTTS: []
  regenerateMessage: [message: ChatMessage]
}>()

// 响应式数据
const inputMessage = ref('')
const inputError = ref('')
const messagesContainer = ref<HTMLElement>()
const messageInput = ref<HTMLTextAreaElement>()
const showScrollToBottom = ref(false)
const isPlayingAudio = ref<number | null>(null)
const typingMessageId = ref<number | null>(null)
const displayedText = ref('')
const ttsEnabled = ref(true)

// 欢迎建议
const welcomeSuggestions = [
  '你好，很高兴认识你',
  '今天心情怎么样？',
  '聊聊你的兴趣爱好吧',
  '有什么烦恼想要倾诉吗？'
]

// 快捷回复
const quickReplies = computed(() => {
  if (props.messages.length === 0) return []
  
  const lastMessage = props.messages[props.messages.length - 1]
  if (lastMessage.role === 'user') return []
  
  // 根据AI的回复内容生成快捷回复建议
  const suggestions = [
    '继续聊这个话题',
    '换个话题吧',
    '你说得对',
    '我想知道更多'
  ]
  
  return suggestions.slice(0, 3)
})

// 计算属性
const canSend = computed(() => {
  return inputMessage.value.trim().length > 0 && 
         inputMessage.value.length <= 500 && 
         !props.isLoading
})

// 方法
const getPersonalityName = (personality: string): string => {
  const names: { [key: string]: string } = {
    default: '七崽',
    tsundere: '傲娇七崽',
    tech: '科技七崽',
    healing: '治愈七崽',
    defensive: '防御七崽'
  }
  return names[personality] || '七崽'
}

const getPersonalityWelcome = (personality: string): string => {
  const welcomes: { [key: string]: string } = {
    default: '我是你的专属AI伙伴，有什么想聊的吗？',
    tsundere: '哼，不是我想和你聊天，只是...有点无聊而已',
    tech: '系统已就绪，准备进行高效的信息交流',
    healing: '我会用心倾听你的每一句话，陪伴你度过美好时光',
    defensive: '请保持适当距离，我们可以进行基础对话'
  }
  return welcomes[personality] || welcomes.default
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

const getPersonalityBadgeStyle = (personality: string): string => {
  const styleMap: { [key: string]: string } = {
    default: 'bg-blue-500/20 text-blue-300',
    tsundere: 'bg-pink-500/20 text-pink-300',
    tech: 'bg-cyan-500/20 text-cyan-300',
    healing: 'bg-green-500/20 text-green-300',
    defensive: 'bg-orange-500/20 text-orange-300'
  }
  return styleMap[personality] || styleMap.default
}

const formatTime = (timeString: string): string => {
  const time = new Date(timeString)
  return time.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const sendMessage = () => {
  if (!canSend.value) return
  
  const content = inputMessage.value.trim()
  inputMessage.value = ''
  inputError.value = ''
  
  emit('sendMessage', content)
  
  // 自动调整输入框高度
  if (messageInput.value) {
    messageInput.value.style.height = '44px'
  }
}

const sendSuggestion = (suggestion: string) => {
  inputMessage.value = suggestion
  sendMessage()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      sendMessage()
    } else if (!event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }
}

const handleInput = () => {
  // 清除错误信息
  inputError.value = ''
  
  // 字数限制检查
  if (inputMessage.value.length > 500) {
    inputError.value = '消息长度不能超过500字符'
  }
  
  // 自动调整输入框高度
  if (messageInput.value) {
    messageInput.value.style.height = '44px'
    messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px'
  }
}

const handleScroll = () => {
  if (!messagesContainer.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
  
  showScrollToBottom.value = !isNearBottom
}

const scrollToBottom = (smooth = true) => {
  if (!messagesContainer.value) return
  
  messagesContainer.value.scrollTo({
    top: messagesContainer.value.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    // 这里可以显示复制成功的提示
  } catch (error) {
    console.error('复制失败:', error)
  }
}

const regenerateMessage = (message: ChatMessage) => {
  emit('regenerateMessage', message)
}

const playMessageAudio = (message: ChatMessage) => {
  if (isPlayingAudio.value === message.id) {
    // 停止播放
    isPlayingAudio.value = null
    // 这里应该停止音频播放
  } else {
    // 开始播放
    isPlayingAudio.value = message.id
    // 这里应该开始音频播放
    
    // 模拟播放完成
    setTimeout(() => {
      isPlayingAudio.value = null
    }, 3000)
  }
}

// 打字机效果
const typeMessage = (message: ChatMessage) => {
  typingMessageId.value = message.id
  displayedText.value = ''
  
  const text = message.content
  let index = 0
  
  const typeInterval = setInterval(() => {
    if (index < text.length) {
      displayedText.value += text[index]
      index++
    } else {
      clearInterval(typeInterval)
      typingMessageId.value = null
    }
  }, 50)
}

// 监听消息变化，自动滚动到底部
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    scrollToBottom(false)
    
    // 如果是新的AI消息，启动打字机效果
    const lastMessage = props.messages[props.messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      typeMessage(lastMessage)
    }
  }
)

// 监听加载状态变化
watch(
  () => props.isLoading,
  async (isLoading) => {
    if (isLoading) {
      await nextTick()
      scrollToBottom()
    }
  }
)

onMounted(() => {
  // 初始滚动到底部
  nextTick(() => {
    scrollToBottom(false)
  })
  
  // 聚焦输入框
  messageInput.value?.focus()
})
</script>

<style scoped>
/* 消息项动画 */
.message-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 打字机效果 */
.typing-animation {
  display: inline;
}

.typing-cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #1f2937;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* 输入框动画 */
textarea:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 按钮悬停效果 */
button:hover:not(:disabled) {
  transform: translateY(-1px);
}

/* 加载动画 */
.animate-bounce {
  animation: bounce 1.4s infinite ease-in-out both;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 消息悬停效果 */
.message-item:hover .opacity-0 {
  opacity: 1;
}

/* 快捷回复按钮动画 */
.flex-wrap button {
  animation: slideInLeft 0.3s ease-out;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>