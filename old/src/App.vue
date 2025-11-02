<template>
  <div id="app" class="h-screen w-screen overflow-hidden bg-gray-900 text-white">
    <!-- 登录界面 -->
    <LoginForm 
      v-if="!isAuthenticated"
      @login="handleLogin"
      @register="handleRegister"
    />
    
    <!-- 主应用界面 -->
    <div v-else class="h-full w-full flex">
      <!-- 侧边栏 -->
      <div class="w-80 h-full border-r border-gray-700 flex-shrink-0">
        <Sidebar 
          :sessions="chatSessions"
          :currentSessionId="currentSessionId"
          @selectSession="selectSession"
          @newSession="createNewSession"
          @deleteSession="deleteSession"
        />
      </div>
      
      <!-- 主内容区 -->
      <div class="flex-1 h-full flex flex-col">
        <!-- 顶部导航栏 -->
        <div class="h-16 border-b border-gray-700 flex-shrink-0">
          <Header 
            :currentPersonality="currentPersonality"
            :memoryCount="unlockedMemoryCount"
            @toggleAffinity="showAffinityPanel = !showAffinityPanel"
            @toggleMemory="showMemoryPanel = !showMemoryPanel"
            @toggleMorality="showMoralityPanel = !showMoralityPanel"
            @toggleSettings="showSettings = !showSettings"
            @personalityChange="handlePersonalityChange"
            @logout="logout"
          />
        </div>
        
        <!-- 聊天区域 -->
        <div class="flex-1 overflow-hidden relative">
          <!-- 角色切换动画 -->
          <PersonalitySwitchAnimation 
            v-if="showPersonalitySwitchAnimation"
            :oldPersonality="previousPersonality"
            :newPersonality="currentPersonality"
            @animationComplete="showPersonalitySwitchAnimation = false"
          />
          
          <!-- 游戏化聊天界面 -->
          <GameChatInterface 
            :messages="currentMessages"
            :isLoading="isLoading"
            :currentPersonality="currentPersonality"
            @sendMessage="sendMessage"
            @voiceInput="handleVoiceInput"
          />
        </div>
      </div>
      
      <!-- 右侧面板区域 -->
      <div v-if="showAffinityPanel || showMemoryPanel || showSettings || showMoralityPanel" class="w-96 h-full border-l border-gray-700 flex-shrink-0 overflow-y-auto">
        <!-- 道德系统面板 -->
        <MoralSystemPanel 
          v-if="showMoralityPanel"
          :corruption="moralityValues.corruption"
          :purity="moralityValues.purity"
          :recentChoices="recentMoralChoices"
          @close="showMoralityPanel = false"
        />
        
        <!-- 记忆收集面板 -->
        <MemoryCollectionPanel 
          v-if="showMemoryPanel"
          :memories="memoryFragments"
          @close="showMemoryPanel = false"
        />
        
        <!-- 好感度面板 -->
        <AffinityPanel 
          v-if="showAffinityPanel"
          @close="showAffinityPanel = false"
        />
        
        <!-- 设置面板 -->
        <SettingsPanel 
          v-if="showSettings"
          :settings="userSettings"
          @settingsChanged="handleSettingsChanged"
          @close="showSettings = false"
        />
      </div>
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
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { useChatStore } from './stores/chat'
import { useMemoryStore } from './stores/memory'
import { useAffinityStore } from './stores/affinity'
import { useMemoryFragmentStore } from './stores/memoryFragment'
import { useSettingsStore } from './stores/settings'
import { useGameTheme } from './composables/useGameTheme'
import { useGameAudio } from './composables/useGameAudio'

// 组件导入
import Sidebar from './components/Sidebar.vue'
import Header from './components/Header.vue'
import GameChatInterface from './components/GameChatInterface.vue'
import PersonalitySwitchAnimation from './components/PersonalitySwitchAnimation.vue'
import MoralSystemPanel from './components/MoralSystemPanel.vue'
import MemoryCollectionPanel from './components/MemoryCollectionPanel.vue'
import LoginForm from './components/LoginForm.vue'
import AffinityPanel from './components/AffinityPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import NotificationToast from './components/NotificationToast.vue'

// 状态管理
const authStore = useAuthStore()
const chatStore = useChatStore()
const memoryStore = useMemoryStore()
const affinityStore = useAffinityStore()
const memoryFragmentStore = useMemoryFragmentStore()
const settingsStore = useSettingsStore()

// 游戏化功能
const { currentPersonality: themePersonality, switchPersonality } = useGameTheme()
const { playSound, playPersonalityAmbient, toggleAudio, audioConfig } = useGameAudio()

// 响应式数据
const isLoading = ref(false)
const showMemoryPanel = ref(false)
const showAffinityPanel = ref(false)
const showSettings = ref(false)
const showMoralityPanel = ref(false)
const showPersonalitySwitchAnimation = ref(false)
const previousPersonality = ref<string>('neutral')
const notification = ref<{
  type: 'success' | 'error' | 'info'
  message: string
} | null>(null)

// 道德值系统
const moralityValues = reactive({
  corruption: 30,
  purity: 70
})

const recentMoralChoices = ref([
  { id: '1', choice: '选择了诚实', impact: 5, timestamp: new Date() },
  { id: '2', choice: '拒绝了诱惑', impact: 3, timestamp: new Date() },
  { id: '3', choice: '帮助了他人', impact: 8, timestamp: new Date() }
])

// 计算属性
const isAuthenticated = computed(() => authStore.isAuthenticated)
const chatSessions = computed(() => chatStore.sessions)
const currentSessionId = computed(() => chatStore.currentSessionId)
const currentMessages = computed(() => chatStore.currentMessages)
const currentPersonality = computed(() => chatStore.currentPersonality)
const memoryFragments = computed(() => memoryStore.fragments)
const unlockedMemoryCount = computed(() => memoryStore.unlockedCount)

// 用户设置
const userSettings = reactive({
  enableTTS: true,
  autoSave: true,
  theme: 'dark'
})

// 方法
const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 3000)
}

const handleLogin = async (credentials: { username: string; password: string }) => {
  try {
    isLoading.value = true
    await authStore.login(credentials)
    await initializeUserData()
    showNotification('success', '登录成功')
  } catch (error) {
    showNotification('error', '登录失败')
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async (userData: { username: string; password: string; email?: string }) => {
  try {
    isLoading.value = true
    await authStore.register({ username: userData.username, password: userData.password })
    await initializeUserData()
    showNotification('success', '注册成功')
  } catch (error) {
    showNotification('error', '注册失败')
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

const initializeUserData = async () => {
  try {
    // 首先加载会话和其他不依赖会话的数据
    await Promise.all([
      chatStore.loadSessions(),
      memoryStore.loadMemoryFragments(),
      memoryFragmentStore.fetchFragments()
    ])
    
    // 如果没有会话，创建一个新会话
    if (chatStore.sessions.length === 0) {
      await createNewSession()
    }
    
    // 在有会话后再获取好感度数据
    if (chatStore.currentSessionId) {
      try {
        await affinityStore.fetchAffinityData()
      } catch (error) {
        console.warn('获取好感度数据失败:', error)
        // 不阻止应用初始化，只是记录警告
      }
    }
  } catch (error) {
    console.error('初始化用户数据失败:', error)
    showNotification('error', '加载数据失败')
  }
}

const selectSession = async (sessionId: string) => {
  try {
    await chatStore.selectSession(sessionId)
    
    // 切换会话后获取好感度数据
    if (chatStore.currentSessionId) {
      try {
        await affinityStore.fetchAffinityData()
      } catch (error) {
        console.warn('获取好感度数据失败:', error)
      }
    }
  } catch (error) {
    showNotification('error', '切换会话失败')
  }
}

const createNewSession = async () => {
  try {
    isLoading.value = true
    await chatStore.createNewSession()
    
    // 创建会话后获取好感度数据
    if (chatStore.currentSessionId) {
      try {
        await affinityStore.fetchAffinityData()
      } catch (error) {
        console.warn('获取好感度数据失败:', error)
      }
    }
    
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
    const result = await chatStore.sendMessage(content, userSettings.enableTTS)
    
    // 处理人格切换通知
    if (result.personalityChanged && result.currentPersonality && result.personalityChangeReason) {
      const personalityNames = {
        'angel': '天使',
        'demon': '恶魔'
      }
      const personalityName = personalityNames[result.currentPersonality] || result.currentPersonality
      showNotification('info', `🔄 人格已自动切换到${personalityName}模式\n原因: ${result.personalityChangeReason}`)
    }
    
    // 发送消息成功后刷新好感度数据
    if (chatStore.currentSessionId) {
      try {
        await affinityStore.fetchAffinityData()
      } catch (error) {
        console.warn('刷新好感度数据失败:', error)
        // 不影响主要流程，只记录警告
      }
    }
  } catch (error) {
    showNotification('error', '发送消息失败')
  } finally {
    isLoading.value = false
  }
}

const toggleTTS = () => {
  userSettings.enableTTS = !userSettings.enableTTS
  showNotification('info', `语音播放已${userSettings.enableTTS ? '开启' : '关闭'}`)
}

const handlePersonalityChange = (personality: string) => {
  previousPersonality.value = chatStore.currentPersonality
  chatStore.currentPersonality = personality
  
  // 播放切换音效
  if (personality === 'demon') {
    playSound('switchToDemon')
  } else if (personality === 'angel') {
    playSound('switchToAngel')
  }
  
  // 显示切换动画
  showPersonalitySwitchAnimation.value = true
  
  // 切换主题
  switchPersonality(personality as 'demon' | 'angel' | 'neutral')
  
  // 播放角色环境音
  playPersonalityAmbient(personality as 'demon' | 'angel' | 'neutral')
  
  const personalityNames = {
    'demon': '恶魔',
    'angel': '天使',
    'neutral': '中性'
  }
  showNotification('info', `🔄 已切换到${personalityNames[personality as keyof typeof personalityNames] || personality}人格`)
}

const handleVoiceInput = (isRecording: boolean) => {
  if (isRecording) {
    playSound('buttonClick')
    showNotification('info', '🎤 开始语音输入')
  } else {
    playSound('buttonClick')
    showNotification('info', '🎤 语音输入结束')
  }
}

const handleSettingsChanged = (newSettings: any) => {
  Object.assign(userSettings, newSettings)
  settingsStore.updateSettings(newSettings)
  showNotification('success', '设置已保存')
}

// 监听器
watch(() => currentPersonality.value, (newPersonality, oldPersonality) => {
  if (oldPersonality && newPersonality !== oldPersonality) {
    // 自动触发角色切换动画和音效
    previousPersonality.value = oldPersonality
    showPersonalitySwitchAnimation.value = true
    
    if (newPersonality === 'demon') {
      playSound('switchToDemon')
    } else if (newPersonality === 'angel') {
      playSound('switchToAngel')
    }
    
    switchPersonality(newPersonality as 'demon' | 'angel' | 'neutral')
    playPersonalityAmbient(newPersonality as 'demon' | 'angel' | 'neutral')
  }
})

// 生命周期
onMounted(async () => {
  if (authStore.token) {
    try {
      await authStore.validateToken()
      await initializeUserData()
    } catch (error) {
      authStore.logout()
    }
  } else if (import.meta.env.DEV) {
    // 开发环境自动登录测试用户
    try {
      await authStore.login({ username: 'testuser', password: '123456' })
      await initializeUserData()
    } catch (error) {
      console.error('自动登录失败:', error)
    }
  }
  
  // 初始化音频系统
  setTimeout(() => {
    playPersonalityAmbient('neutral')
  }, 1000)
})
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 自定义滚动条 - 仅在需要时显示 */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1f2937;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
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

.slide-enter-from {
  transform: translateX(100%);
}

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
</style>