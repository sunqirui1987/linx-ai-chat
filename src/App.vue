<template>
  <div id="app" class="min-h-screen bg-gray-900 text-white">
    <!-- 主应用容器 -->
    <div class="flex h-screen">
      <!-- 侧边栏 -->
      <Sidebar 
        v-if="isAuthenticated"
        :sessions="chatSessions"
        :currentSessionId="currentSessionId"
        @selectSession="selectSession"
        @newSession="createNewSession"
        @deleteSession="deleteSession"
      />
      
      <!-- 主内容区 -->
      <div class="flex-1 flex flex-col">
        <!-- 顶部导航栏 -->
        <Header 
          v-if="isAuthenticated"
          :currentPersonality="currentPersonality"
          :memoryCount="unlockedMemoryCount"
          @toggleMemory="showMemoryPanel = !showMemoryPanel"
          @toggleSettings="showSettings = !showSettings"
          @logout="logout"
        />
        
        <!-- 聊天界面 -->
        <ChatInterface 
          v-if="isAuthenticated"
          :messages="currentMessages"
          :isLoading="isLoading"
          :currentPersonality="currentPersonality"
          @sendMessage="sendMessage"
          @toggleTTS="toggleTTS"
        />
        
        <!-- 登录界面 -->
        <LoginForm 
          v-else
          @login="handleLogin"
          @register="handleRegister"
        />
      </div>
      
      <!-- 记忆片段面板 -->
      <MemoryPanel 
        v-if="isAuthenticated && showMemoryPanel"
        :memoryFragments="memoryFragments"
        @close="showMemoryPanel = false"
      />
      
      <!-- 设置面板 -->
      <SettingsPanel 
        v-if="isAuthenticated && showSettings"
        :settings="userSettings"
        @updateSettings="updateSettings"
        @close="showSettings = false"
      />
    </div>
    
    <!-- 全局通知 -->
    <NotificationToast 
      v-if="notification"
      :notification="notification"
      @close="notification = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useMemoryStore } from './stores/memory'
import { useSettingsStore } from './stores/settings'

// 组件导入
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import ChatInterface from './components/ChatInterface.vue'
import LoginForm from './components/LoginForm.vue'
import MemoryPanel from './components/MemoryPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import NotificationToast from './components/NotificationToast.vue'

// 状态管理
const authStore = useAuthStore()
const chatStore = useChatStore()
const memoryStore = useMemoryStore()
const settingsStore = useSettingsStore()

// 响应式数据
const isLoading = ref(false)
const showMemoryPanel = ref(false)
const showSettings = ref(false)
const notification = ref<{
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
} | null>(null)

// 计算属性
const isAuthenticated = computed(() => authStore.isAuthenticated)
const chatSessions = computed(() => chatStore.sessions)
const currentSessionId = computed(() => chatStore.currentSessionId)
const currentMessages = computed(() => chatStore.currentMessages)
const currentPersonality = computed(() => chatStore.currentPersonality)
const memoryFragments = computed(() => memoryStore.fragments)
const unlockedMemoryCount = computed(() => memoryStore.unlockedCount)
const userSettings = computed(() => settingsStore.settings)

// 方法
const selectSession = async (sessionId: string) => {
  try {
    isLoading.value = true
    await chatStore.selectSession(sessionId)
  } catch (error) {
    showNotification('error', '切换会话失败')
  } finally {
    isLoading.value = false
  }
}

const createNewSession = async () => {
  try {
    isLoading.value = true
    await chatStore.createNewSession()
    showNotification('success', '创建新会话成功')
  } catch (error) {
    showNotification('error', '创建会话失败')
  } finally {
    isLoading.value = false
  }
}

const deleteSession = async (sessionId: string) => {
  try {
    await chatStore.deleteSession(sessionId)
    showNotification('success', '删除会话成功')
  } catch (error) {
    showNotification('error', '删除会话失败')
  }
}

const sendMessage = async (content: string) => {
  try {
    isLoading.value = true
    const response = await chatStore.sendMessage(content, userSettings.value.enableTTS)
    
    // 检查是否有新的记忆片段解锁
    if (response.memoryUnlocked && response.memoryUnlocked.length > 0) {
      await memoryStore.refreshMemoryFragments()
      showNotification('info', `解锁了新的记忆片段！`, 3000)
    }
    
    // 播放语音（如果启用）
    if (response.audioUrl && userSettings.value.enableTTS) {
      playAudio(response.audioUrl)
    }
  } catch (error) {
    showNotification('error', '发送消息失败')
  } finally {
    isLoading.value = false
  }
}

const handleLogin = async (credentials: { username: string; password: string }) => {
  try {
    isLoading.value = true
    await authStore.login(credentials)
    await initializeUserData()
    showNotification('success', '登录成功！欢迎回来~')
  } catch (error) {
    showNotification('error', '登录失败，请检查用户名和密码')
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async (credentials: { username: string; password: string }) => {
  try {
    isLoading.value = true
    await authStore.register(credentials)
    await initializeUserData()
    showNotification('success', '注册成功！七崽正在等你~')
  } catch (error) {
    showNotification('error', '注册失败，用户名可能已存在')
  } finally {
    isLoading.value = false
  }
}

const logout = async () => {
  try {
    await authStore.logout()
    chatStore.clearData()
    memoryStore.clearData()
    showNotification('info', '已退出登录')
  } catch (error) {
    showNotification('error', '退出登录失败')
  }
}

const toggleTTS = () => {
  settingsStore.updateSettings({
    enableTTS: !userSettings.value.enableTTS
  })
  showNotification('info', `语音播放已${userSettings.value.enableTTS ? '开启' : '关闭'}`)
}

const updateSettings = (newSettings: any) => {
  settingsStore.updateSettings(newSettings)
  showNotification('success', '设置已保存')
}

const initializeUserData = async () => {
  try {
    // 加载聊天会话
    await chatStore.loadSessions()
    
    // 加载记忆片段
    await memoryStore.loadMemoryFragments()
    
    // 如果没有会话，创建一个新的
    if (chatSessions.value.length === 0) {
      await createNewSession()
    }
  } catch (error) {
    console.error('初始化用户数据失败:', error)
  }
}

const showNotification = (type: 'success' | 'error' | 'info', message: string, duration = 2000) => {
  notification.value = { type, message, duration }
  setTimeout(() => {
    notification.value = null
  }, duration)
}

const playAudio = (audioUrl: string) => {
  try {
    const audio = new Audio(audioUrl)
    audio.volume = userSettings.value.volume / 100
    audio.play().catch(error => {
      console.error('音频播放失败:', error)
    })
  } catch (error) {
    console.error('音频播放失败:', error)
  }
}

// 生命周期
onMounted(async () => {
  // 检查是否已登录
  if (authStore.token) {
    try {
      await authStore.validateToken()
      await initializeUserData()
    } catch (error) {
      // Token无效，清除登录状态
      authStore.logout()
    }
  }
})
</script>

<style>
/* 全局样式 */
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #1f2937;
}

::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* 文字特效 */
.text-glow {
  text-shadow: 0 0 10px currentColor;
}

.text-gradient {
  background: linear-gradient(45deg, #4f46e5, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 卡片阴影效果 */
.card-shadow {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.card-shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>