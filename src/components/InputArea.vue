<template>
  <div class="bg-gray-800 border-t border-gray-700 p-4">
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
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { Volume2, VolumeX, Send } from 'lucide-vue-next'

// Props
const props = defineProps<{
  isLoading: boolean
  ttsEnabled: boolean
  quickReplies: string[]
}>()

// Emits
const emit = defineEmits<{
  sendMessage: [content: string]
  sendSuggestion: [suggestion: string]
  toggleTTS: []
}>()

// 响应式数据
const inputMessage = ref('')
const inputError = ref('')
const messageInput = ref<HTMLTextAreaElement | null>(null)

// 计算属性
const canSend = computed(() => {
  return inputMessage.value.trim().length > 0 && 
         inputMessage.value.length <= 500 && 
         !props.isLoading
})

// 方法
const sendMessage = async () => {
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
  // 验证输入长度
  if (inputMessage.value.length > 500) {
    inputError.value = '消息长度不能超过500字符'
  } else {
    inputError.value = ''
  }
  
  // 自动调整输入框高度
  if (messageInput.value) {
    messageInput.value.style.height = '44px'
    messageInput.value.style.height = Math.min(messageInput.value.scrollHeight, 120) + 'px'
  }
}

// 暴露方法给父组件
const focusInput = () => {
  messageInput.value?.focus()
}

defineExpose({
  focusInput
})

// 生命周期
onMounted(() => {
  messageInput.value?.focus()
})
</script>

<style scoped>
/* 输入框动画 */
textarea {
  transition: all 0.2s ease;
}

textarea:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 按钮动画 */
button {
  transition: all 0.2s ease;
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
}

button:active:not(:disabled) {
  transform: translateY(0);
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