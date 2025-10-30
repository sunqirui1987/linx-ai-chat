<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <div class="max-w-md w-full space-y-8 p-8">
      <!-- Logo和标题 -->
      <div class="text-center">
        <div class="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <MessageCircle class="h-8 w-8 text-white" />
        </div>
        <h2 class="text-3xl font-bold text-white mb-2">
          RZ-07 智能体
        </h2>
        <p class="text-gray-400 text-sm">
          与你的专属AI伙伴开始对话
        </p>
      </div>

      <!-- 登录表单 -->
      <div class="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- 用户名输入 -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-300 mb-2">
              用户名
            </label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="username"
                v-model="form.username"
                type="text"
                required
                class="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="请输入用户名"
                :disabled="isLoading"
              />
            </div>
          </div>

          <!-- 密码输入 -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
              密码
            </label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="请输入密码"
                :disabled="isLoading"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                :disabled="isLoading"
              >
                <Eye v-if="showPassword" class="h-5 w-5" />
                <EyeOff v-else class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- 错误信息 -->
          <div v-if="errorMessage" class="bg-red-900/50 border border-red-700 rounded-lg p-3">
            <div class="flex items-center">
              <AlertCircle class="h-5 w-5 text-red-400 mr-2" />
              <span class="text-red-300 text-sm">{{ errorMessage }}</span>
            </div>
          </div>

          <!-- 登录/注册按钮 -->
          <div class="space-y-3">
            <button
              type="submit"
              :disabled="isLoading || !form.username || !form.password"
              class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
            >
              <div v-if="isLoading" class="flex items-center justify-center">
                <Loader2 class="animate-spin h-5 w-5 mr-2" />
                {{ isLoginMode ? '登录中...' : '注册中...' }}
              </div>
              <span v-else>
                {{ isLoginMode ? '登录' : '注册' }}
              </span>
            </button>

            <button
              type="button"
              @click="toggleMode"
              :disabled="isLoading"
              class="w-full py-2 px-4 text-gray-400 hover:text-white transition-colors text-sm"
            >
              {{ isLoginMode ? '没有账号？点击注册' : '已有账号？点击登录' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 功能介绍 -->
      <div class="text-center space-y-4">
        <div class="grid grid-cols-3 gap-4 text-xs text-gray-500">
          <div class="flex flex-col items-center">
            <Brain class="h-6 w-6 mb-1 text-blue-400" />
            <span>智能对话</span>
          </div>
          <div class="flex flex-col items-center">
            <Heart class="h-6 w-6 mb-1 text-red-400" />
            <span>情感陪伴</span>
          </div>
          <div class="flex flex-col items-center">
            <Sparkles class="h-6 w-6 mb-1 text-yellow-400" />
            <span>记忆解锁</span>
          </div>
        </div>
        
        <p class="text-xs text-gray-600">
          体验五种人格模式，解锁专属记忆片段
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { 
  MessageCircle, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2,
  Brain,
  Heart,
  Sparkles
} from 'lucide-vue-next'

// Props
interface LoginCredentials {
  username: string
  password: string
}

// Emits
const emit = defineEmits<{
  login: [credentials: LoginCredentials]
  register: [credentials: LoginCredentials]
}>()

// 响应式数据
const isLoginMode = ref(true)
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const form = reactive({
  username: '',
  password: ''
})

// 方法
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  errorMessage.value = ''
}

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    errorMessage.value = '请填写完整信息'
    return
  }

  if (form.username.length < 3) {
    errorMessage.value = '用户名至少需要3个字符'
    return
  }

  if (form.password.length < 6) {
    errorMessage.value = '密码至少需要6个字符'
    return
  }

  try {
    isLoading.value = true
    errorMessage.value = ''

    const credentials = {
      username: form.username.trim(),
      password: form.password
    }

    if (isLoginMode.value) {
      emit('login', credentials)
    } else {
      emit('register', credentials)
    }
  } catch (error: any) {
    errorMessage.value = error.message || '操作失败，请重试'
  } finally {
    isLoading.value = false
  }
}

// 键盘事件处理
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !isLoading.value) {
    handleSubmit()
  }
}
</script>

<style scoped>
/* 输入框聚焦动画 */
input:focus {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 按钮悬停效果 */
button:hover:not(:disabled) {
  transform: translateY(-1px);
}

/* 加载动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 渐变文字效果 */
.text-gradient {
  background: linear-gradient(45deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 卡片悬停效果 */
.bg-gray-800 {
  transition: all 0.3s ease;
}

.bg-gray-800:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
}
</style>