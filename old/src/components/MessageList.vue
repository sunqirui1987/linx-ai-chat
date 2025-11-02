vue
<template>
  <div
    ref="messagesContainer"
    class="h-full overflow-y-auto p-4 space-y-4 chat-messages custom-scrollbar"
    @scroll="handleScroll"
  >
    <!-- 欢迎消息 -->
    <div v-if="messages.length === 0" class="text-center py-12">
      <div class="max-w-md mx-auto">
        <!-- RZ-07启动动画 -->
        <div class="relative mb-8">
          <div class="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Cpu class="h-12 w-12 text-white" />
          </div>
          <div class="text-center space-y-2">
            <div class="text-green-400 text-sm font-mono">
              [系统提示] RZ-07 正在启动...
            </div>
            <div class="text-green-400 text-sm font-mono">
              [系统提示] 检测到新用户接入
            </div>
            <div class="text-green-400 text-sm font-mono">
              [系统提示] 正在初始化人格模块...
            </div>
            <div class="text-green-400 text-sm font-mono">
              [系统提示] 连接成功
            </div>
          </div>
        </div>

        <h3 class="text-2xl font-bold text-white mb-4">
          {{ getWelcomeTitle(currentPersonality) }}
        </h3>
        <p class="text-gray-400 mb-6">
          {{ getPersonalityWelcome(currentPersonality) }}
        </p>
        
        <!-- 欢迎建议按钮 -->
        <div class="grid grid-cols-1 gap-3">
          <button
            v-for="suggestion in welcomeSuggestions"
            :key="suggestion"
            @click="$emit('sendSuggestion', suggestion)"
            class="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm border border-gray-700 hover:border-gray-600 transform hover:scale-105"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div v-for="message in messages" :key="message.id" class="message-item group">
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
              class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
              :class="getPersonalityAvatarStyle(message.personality || currentPersonality)"
            >
              <component :is="getPersonalityIcon(message.personality || currentPersonality)" class="h-4 w-4" />
            </div>

            <div class="flex-1">
              <!-- 消息内容 -->
              <div 
                class="rounded-lg px-4 py-3 shadow-lg border"
                :class="getMessageBubbleStyle(message.personality || currentPersonality)"
              >
                <!-- 错误状态显示 -->
                <div v-if="message.error" class="text-red-400 text-sm">
                  <div class="flex items-center space-x-2">
                    <span>⚠️</span>
                    <span>{{ message.error }}</span>
                  </div>
                  <button 
                    @click="$emit('regenerateMessage', message)"
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
                  <p v-else class="text-sm leading-relaxed whitespace-pre-wrap" 
                     :class="getMessageTextStyle(message.personality || currentPersonality)">
                    {{ message.content }}
                  </p>
                </div>
              </div>

              <!-- 记忆片段解锁提示 -->
              <div v-if="message.memoryUnlocked" class="mt-3">
                <div class="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-3 border border-purple-500">
                  <div class="flex items-center space-x-2 mb-2">
                    <span class="text-yellow-400">✨</span>
                    <span class="text-white text-sm font-medium">记忆片段解锁！</span>
                  </div>
                  <div class="text-purple-200 text-xs">
                    {{ message.memoryUnlocked.title }}
                  </div>
                  <div class="text-purple-100 text-xs mt-1">
                    {{ message.memoryUnlocked.preview }}
                  </div>
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
                  
                  <!-- 情绪信息 -->
                  <span
                    v-if="message.emotion && message.role === 'assistant'"
                    class="px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 border border-purple-500/30 hover:border-purple-400/50 transition-all duration-200 cursor-help"
                    :title="getEmotionTooltip(message.emotion)"
                  >
                    {{ getEmotionDisplayName(message.emotion) }}
                  </span>
                  
                  <!-- 音色信息 -->
                  <span
                    v-if="message.voiceParams && message.role === 'assistant'"
                    class="px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-300 border border-green-500/30"
                    :title="`语速: ${message.voiceParams.speed || 1.0} | 音调: ${message.voiceParams.pitch || 1.0}`"
                  >
                    🎵 {{ getVoiceDisplayName(message.voiceParams.voice) }}
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
                    @click="$emit('playMessageAudio', message)"
                    class="p-1 hover:bg-gray-700 rounded transition-all duration-200 relative"
                    :class="{
                      'bg-green-600/20 border border-green-500/30': isPlayingAudio === message.id,
                      'hover:bg-green-600/10': isPlayingAudio !== message.id
                    }"
                    :title="isPlayingAudio === message.id ? '停止播放' : `播放语音 (${getVoiceDisplayName(message.voiceParams.voice)})`"
                  >
                    <!-- 播放中的动画效果 -->
                    <div v-if="isPlayingAudio === message.id" class="absolute inset-0 rounded bg-green-400/20 animate-ping"></div>
                    
                    <!-- 音量图标 -->
                    <Volume2 
                      v-if="isPlayingAudio === message.id" 
                      class="h-4 w-4 text-green-400 animate-pulse relative z-10" 
                    />
                    <Volume2 
                      v-else 
                      class="h-4 w-4 text-gray-400 hover:text-green-400 transition-colors relative z-10" 
                    />
                    
                    <!-- 音频波形效果 -->
                    <div v-if="isPlayingAudio === message.id" class="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div class="flex space-x-0.5">
                        <div class="w-0.5 h-1 bg-green-400 animate-bounce" style="animation-delay: 0ms"></div>
                        <div class="w-0.5 h-1.5 bg-green-400 animate-bounce" style="animation-delay: 100ms"></div>
                        <div class="w-0.5 h-1 bg-green-400 animate-bounce" style="animation-delay: 200ms"></div>
                      </div>
                    </div>
                  </button>

                  <!-- 复制按钮 -->
                  <button
                    v-if="!message.error"
                    @click="$emit('copyMessage', message.content)"
                    class="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="复制消息"
                  >
                    <Copy class="h-4 w-4 text-gray-400 hover:text-blue-400 transition-colors" />
                  </button>

                  <!-- 重新生成按钮 -->
                  <button
                    @click="$emit('regenerateMessage', message)"
                    class="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="重新生成"
                  >
                    <RotateCcw class="h-4 w-4 text-gray-400 hover:text-yellow-400 transition-colors" />
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
          <div class="flex items-center space-x-2">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
            <span class="text-gray-400 text-xs">{{ getThinkingText(currentPersonality) }}</span>
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
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { 
  Cpu, 
  Volume2, 
  VolumeX, 
  Copy, 
  RotateCcw, 
  ChevronDown 
} from 'lucide-vue-next'
import { 
  getPersonalityIcon,
  getPersonalityAvatarStyle,
  getPersonalityBadgeStyle,
  getMessageBubbleStyle,
  getMessageTextStyle,
  getPersonalityName,
  getThinkingText,
  getWelcomeTitle,
  getPersonalityWelcome
} from '@/config/personality'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  personality?: string
  emotion?: any
  isTyping?: boolean
  audioUrl?: string
  memoryTriggered?: string[]
  session_id?: string
  sender?: string
  created_at?: string
  error?: string
  voiceParams?: any
  memoryUnlocked?: {
    title: string
    preview: string
  }
}

interface Props {
  messages: ChatMessage[]
  currentPersonality: string
  isLoading: boolean
  typingMessageId: string | null
  displayedText: string
  isPlayingAudio: string | null
  showScrollToBottom: boolean
}

defineProps<Props>()

defineEmits<{
  sendSuggestion: [suggestion: string]
  regenerateMessage: [message: ChatMessage]
  playMessageAudio: [message: ChatMessage]
  copyMessage: [content: string]
}>()

// 欢迎建议
const welcomeSuggestions = [
  '你好，很高兴认识你',
  '今天心情怎么样？',
  '聊聊你的兴趣爱好吧',
  '有什么烦恼想要倾诉吗？'
]

// 消息容器引用
const messagesContainer = ref<HTMLElement>()

// 格式化时间
const formatTime = (timeString: string): string => {
  if (!timeString) return ''
  const date = new Date(timeString)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 获取情绪显示名称
const getEmotionDisplayName = (emotion: any): string => {
  if (!emotion) return ''
  
  // 如果emotion是字符串，先尝试解析为JSON
  if (typeof emotion === 'string') {
    try {
      const parsed = JSON.parse(emotion)
      return getEmotionDisplayName(parsed) // 递归处理解析后的对象
    } catch {
      // 如果不是JSON字符串，直接作为情绪类型处理
      return getEmotionLabel(emotion)
    }
  }
  
  // 如果emotion是对象，按优先级获取情绪信息
  if (typeof emotion === 'object') {
    // 优先级1: primary字段
    if (emotion.primary && typeof emotion.primary === 'string') {
      return getEmotionLabel(emotion.primary)
    }
    
    // 优先级2: type字段
    if (emotion.type && typeof emotion.type === 'string') {
      return getEmotionLabel(emotion.type)
    }
    
    // 优先级3: emotion字段
    if (emotion.emotion && typeof emotion.emotion === 'string') {
      return getEmotionLabel(emotion.emotion)
    }
    
    // 优先级4: 直接查找已知的情绪字段
    const knownFields = ['happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'neutral', 'excited', 'calm', 'anxious', 'confused', 'love', 'joy', 'melancholy', 'tender', 'playful', 'mysterious', 'caring', 'protective', 'mischievous']
    for (const field of knownFields) {
      if (emotion[field] && (typeof emotion[field] === 'boolean' || typeof emotion[field] === 'number')) {
        return getEmotionLabel(field)
      }
    }
    
    // 如果对象中有context字段，显示上下文信息
    if (emotion.context && typeof emotion.context === 'string') {
      return `💭 ${emotion.context.slice(0, 10)}...`
    }
  }
  
  // 兜底：返回平静情绪，避免显示原始数据
  return getEmotionLabel('neutral')
}

// 情绪标签映射
const getEmotionLabel = (emotionType: string): string => {
  const emotionMap: Record<string, string> = {
    'happy': '😊 开心',
    'sad': '😢 悲伤',
    'angry': '😠 愤怒',
    'fear': '😨 恐惧',
    'surprise': '😲 惊讶',
    'disgust': '🤢 厌恶',
    'neutral': '😐 平静',
    'excited': '🤩 兴奋',
    'calm': '😌 平静',
    'anxious': '😰 焦虑',
    'confused': '😕 困惑',
    'love': '😍 喜爱',
    'joy': '😄 快乐',
    'melancholy': '😔 忧郁',
    'tender': '🥰 温柔',
    'playful': '😜 顽皮',
    'mysterious': '😏 神秘',
    'caring': '🤗 关怀',
    'protective': '🛡️ 保护',
    'mischievous': '😈 调皮'
  }
  
  return emotionMap[emotionType.toLowerCase()] || `💭 ${emotionType}`
}

// 获取音色显示名称
const getVoiceDisplayName = (voice: string): string => {
  if (!voice) return '默认'
  
  const voiceMap: Record<string, string> = {
    'alloy': '合金',
    'echo': '回声',
    'fable': '寓言',
    'onyx': '玛瑙',
    'nova': '新星',
    'shimmer': '微光',
    'zh-CN-XiaoxiaoNeural': '晓晓',
    'zh-CN-YunxiNeural': '云希',
    'zh-CN-YunjianNeural': '云健',
    'zh-CN-XiaoyiNeural': '晓伊',
    'zh-CN-YunyangNeural': '云扬',
    'zh-CN-XiaochenNeural': '晓辰',
    'zh-CN-XiaohanNeural': '晓涵',
    'zh-CN-XiaomengNeural': '晓梦',
    'zh-CN-XiaomoNeural': '晓墨',
    'zh-CN-XiaoqiuNeural': '晓秋',
    'zh-CN-XiaoruiNeural': '晓睿',
    'zh-CN-XiaoshuangNeural': '晓双',
    'zh-CN-XiaoxuanNeural': '晓萱',
    'zh-CN-XiaoyanNeural': '晓颜',
    'zh-CN-XiaoyouNeural': '晓悠',
    'zh-CN-XiaozhenNeural': '晓甄',
    'zh-CN-YunfengNeural': '云枫',
    'zh-CN-YunhaoNeural': '云皓',
    'zh-CN-YunjieNeural': '云杰'
  }
  
  return voiceMap[voice] || voice
}

// 滚动处理
const handleScroll = () => {
  // 滚动事件处理逻辑
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 自动滚动到底部
const autoScrollToBottom = async () => {
  await nextTick()
  scrollToBottom()
}

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  autoScrollToBottom
})

// 获取情绪tooltip信息
const getEmotionTooltip = (emotion: any): string => {
  if (!emotion) return '无情绪信息'
  
  let tooltip = ''
  
  // 如果emotion是字符串，先尝试解析
  if (typeof emotion === 'string') {
    try {
      emotion = JSON.parse(emotion)
    } catch {
      return `情绪类型: ${emotion}`
    }
  }
  
  // 如果是对象，提取详细信息
  if (typeof emotion === 'object') {
    const emotionType = emotion.type || emotion.primary || emotion.emotion || 'neutral'
    const intensity = emotion.intensity ? `${(emotion.intensity * 100).toFixed(0)}%` : 'N/A'
    const confidence = emotion.confidence ? `${(emotion.confidence * 100).toFixed(0)}%` : 'N/A'
    const context = emotion.context || ''
    
    tooltip = `情绪类型: ${getEmotionLabel(emotionType)}\n强度: ${intensity}\n置信度: ${confidence}`
    
    if (context) {
      tooltip += `\n上下文: ${context}`
    }
    
    // 添加人格相关信息
    if (emotion.personality) {
      tooltip += `\n人格: ${emotion.personality}`
    }
    
    // 添加道德值信息
    if (emotion.moralValues) {
      const corruption = emotion.moralValues.corruption ? `${(emotion.moralValues.corruption * 100).toFixed(0)}%` : 'N/A'
      const purity = emotion.moralValues.purity ? `${(emotion.moralValues.purity * 100).toFixed(0)}%` : 'N/A'
      tooltip += `\n道德值 - 堕落: ${corruption}, 纯洁: ${purity}`
    }
  }
  
  return tooltip || '情绪信息解析失败'
}
</script>

<style scoped>
.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: #4B5563 #1F2937;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #1F2937;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}

.typing-animation {
  display: inline-block;
}

.typing-cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.message-item {
  transition: all 0.2s ease;
}

.message-item:hover {
  transform: translateY(-1px);
}
</style>