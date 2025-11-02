<template>
  <div class="w-96 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
    <!-- 头部 -->
    <div class="p-4 border-b border-gray-700">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-white flex items-center">
          <Settings class="h-6 w-6 mr-2 text-blue-400" />
          设置
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

    <!-- 设置内容 -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-4 space-y-6">
        <!-- 语音设置 -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Volume2 class="h-5 w-5 mr-2 text-blue-400" />
            语音设置
          </h3>

          <div class="space-y-3">
            <!-- TTS 开关 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">启用语音合成</label>
              <button
                @click="toggleTTS"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.voice.enabled ? 'bg-blue-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.voice.enabled ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 语音速度 -->
            <div class="space-y-2">
              <label class="text-sm text-gray-300">语音速度</label>
              <div class="flex items-center space-x-3">
                <span class="text-xs text-gray-500">慢</span>
                <input
                  v-model="settings.voice.speed"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  @input="updateVoiceSettings"
                />
                <span class="text-xs text-gray-500">快</span>
              </div>
              <div class="text-xs text-gray-400 text-center">{{ settings.voice.speed }}x</div>
            </div>

            <!-- 语音音量 -->
            <div class="space-y-2">
              <label class="text-sm text-gray-300">语音音量</label>
              <div class="flex items-center space-x-3">
                <VolumeX class="h-4 w-4 text-gray-500" />
                <input
                  v-model="settings.voice.volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  @input="updateVoiceSettings"
                />
                <Volume2 class="h-4 w-4 text-gray-500" />
              </div>
              <div class="text-xs text-gray-400 text-center">{{ Math.round(settings.voice.volume * 100) }}%</div>
            </div>

            <!-- 自动播放 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">自动播放AI回复</label>
              <button
                @click="settings.voice.autoPlay = !settings.voice.autoPlay; updateVoiceSettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.voice.autoPlay ? 'bg-blue-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.voice.autoPlay ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- 界面设置 -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Palette class="h-5 w-5 mr-2 text-purple-400" />
            界面设置
          </h3>

          <div class="space-y-3">
            <!-- 主题选择 -->
            <div class="space-y-2">
              <label class="text-sm text-gray-300">主题</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  @click="setTheme('dark')"
                  class="p-3 rounded-lg border transition-colors"
                  :class="settings.ui.theme === 'dark' ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600 bg-gray-700 hover:bg-gray-650'"
                >
                  <div class="flex items-center space-x-2">
                    <Moon class="h-4 w-4 text-purple-400" />
                    <span class="text-sm text-white">暗色</span>
                  </div>
                </button>
                <button
                  @click="setTheme('light')"
                  class="p-3 rounded-lg border transition-colors"
                  :class="settings.ui.theme === 'light' ? 'border-purple-500 bg-purple-500/20' : 'border-gray-600 bg-gray-700 hover:bg-gray-650'"
                >
                  <div class="flex items-center space-x-2">
                    <Sun class="h-4 w-4 text-yellow-400" />
                    <span class="text-sm text-white">亮色</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- 字体大小 -->
            <div class="space-y-2">
              <label class="text-sm text-gray-300">字体大小</label>
              <div class="flex items-center space-x-3">
                <Type class="h-4 w-4 text-gray-500" />
                <input
                  v-model="settings.ui.fontSize"
                  type="range"
                  min="12"
                  max="18"
                  step="1"
                  class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  @input="updateUISettings"
                />
                <Type class="h-5 w-5 text-gray-500" />
              </div>
              <div class="text-xs text-gray-400 text-center">{{ settings.ui.fontSize }}px</div>
            </div>

            <!-- 动画效果 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">动画效果</label>
              <button
                @click="settings.ui.animations = !settings.ui.animations; updateUISettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.ui.animations ? 'bg-purple-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.ui.animations ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 紧凑模式 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">紧凑模式</label>
              <button
                @click="settings.ui.compactMode = !settings.ui.compactMode; updateUISettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.ui.compactMode ? 'bg-purple-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.ui.compactMode ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- 聊天设置 -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <MessageCircle class="h-5 w-5 mr-2 text-green-400" />
            聊天设置
          </h3>

          <div class="space-y-3">
            <!-- 打字机效果 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">打字机效果</label>
              <button
                @click="settings.chat.typewriterEffect = !settings.chat.typewriterEffect; updateChatSettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.chat.typewriterEffect ? 'bg-green-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.chat.typewriterEffect ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 打字速度 -->
            <div class="space-y-2">
              <label class="text-sm text-gray-300">打字速度</label>
              <div class="flex items-center space-x-3">
                <span class="text-xs text-gray-500">慢</span>
                <input
                  v-model="settings.chat.typewriterSpeed"
                  type="range"
                  min="20"
                  max="100"
                  step="10"
                  class="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  @input="updateChatSettings"
                />
                <span class="text-xs text-gray-500">快</span>
              </div>
              <div class="text-xs text-gray-400 text-center">{{ settings.chat.typewriterSpeed }}ms/字</div>
            </div>

            <!-- 自动滚动 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">自动滚动到底部</label>
              <button
                @click="settings.chat.autoScroll = !settings.chat.autoScroll; updateChatSettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.chat.autoScroll ? 'bg-green-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.chat.autoScroll ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 发送快捷键 -->
            <div class="space-y-2">
              <label class="text-sm text-gray-300">发送快捷键</label>
              <select
                v-model="settings.chat.sendShortcut"
                @change="updateChatSettings"
                class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="enter">Enter</option>
                <option value="ctrl+enter">Ctrl + Enter</option>
                <option value="shift+enter">Shift + Enter</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 人格设置 -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Users class="h-5 w-5 mr-2 text-pink-400" />
            人格设置
          </h3>

          <div class="space-y-3">
            <!-- 自动切换人格 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">自动切换人格</label>
              <button
                @click="settings.personality.autoSwitch = !settings.personality.autoSwitch; updatePersonalitySettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.personality.autoSwitch ? 'bg-pink-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.personality.autoSwitch ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 情绪感知 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">情绪感知</label>
              <button
                @click="settings.personality.emotionDetection = !settings.personality.emotionDetection; updatePersonalitySettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.personality.emotionDetection ? 'bg-pink-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.personality.emotionDetection ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 默认人格 -->
            <div class="space-y-2">
              <label class="text-sm text-gray-300">默认人格</label>
              <select
                v-model="settings.personality.defaultPersonality"
                @change="updatePersonalitySettings"
                class="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="angel">天使模式</option>
                <option value="demon">恶魔模式</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 记忆设置 -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Brain class="h-5 w-5 mr-2 text-indigo-400" />
            记忆设置
          </h3>

          <div class="space-y-3">
            <!-- 自动解锁记忆 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">自动解锁记忆</label>
              <button
                @click="settings.memory.autoUnlock = !settings.memory.autoUnlock; updateMemorySettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.memory.autoUnlock ? 'bg-indigo-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.memory.autoUnlock ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 解锁提醒 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">解锁提醒</label>
              <button
                @click="settings.memory.unlockNotifications = !settings.memory.unlockNotifications; updateMemorySettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.memory.unlockNotifications ? 'bg-indigo-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.memory.unlockNotifications ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- 高级设置 -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Cog class="h-5 w-5 mr-2 text-orange-400" />
            高级设置
          </h3>

          <div class="space-y-3">
            <!-- 开发者模式 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">开发者模式</label>
              <button
                @click="settings.advanced.developerMode = !settings.advanced.developerMode; updateAdvancedSettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.advanced.developerMode ? 'bg-orange-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.advanced.developerMode ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 调试日志 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">调试日志</label>
              <button
                @click="settings.advanced.debugLogs = !settings.advanced.debugLogs; updateAdvancedSettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.advanced.debugLogs ? 'bg-orange-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.advanced.debugLogs ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>

            <!-- 性能监控 -->
            <div class="flex items-center justify-between">
              <label class="text-sm text-gray-300">性能监控</label>
              <button
                @click="settings.advanced.performanceMonitoring = !settings.advanced.performanceMonitoring; updateAdvancedSettings()"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                :class="settings.advanced.performanceMonitoring ? 'bg-orange-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  :class="settings.advanced.performanceMonitoring ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="p-4 border-t border-gray-700 space-y-3">
      <!-- 数据管理 -->
      <div class="flex space-x-2">
        <button
          @click="exportSettings"
          class="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
        >
          <Download class="h-4 w-4 mr-1" />
          导出设置
        </button>
        <button
          @click="importSettings"
          class="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
        >
          <Upload class="h-4 w-4 mr-1" />
          导入设置
        </button>
      </div>

      <!-- 重置设置 -->
      <button
        @click="showResetConfirm = true"
        class="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
      >
        <RotateCcw class="h-4 w-4 mr-1" />
        重置所有设置
      </button>
    </div>

    <!-- 重置确认对话框 -->
    <div
      v-if="showResetConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click="showResetConfirm = false"
    >
      <div
        class="bg-gray-800 rounded-lg max-w-sm w-full border border-gray-700 p-6"
        @click.stop
      >
        <div class="text-center">
          <AlertTriangle class="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h3 class="text-lg font-bold text-white mb-2">重置设置</h3>
          <p class="text-gray-300 text-sm mb-6">
            确定要重置所有设置吗？此操作无法撤销。
          </p>
          <div class="flex space-x-3">
            <button
              @click="showResetConfirm = false"
              class="flex-1 py-2 px-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              取消
            </button>
            <button
              @click="resetSettings"
              class="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              确定重置
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件输入（隐藏） -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Palette,
  Moon,
  Sun,
  Type,
  MessageCircle,
  Users,
  Brain,
  Cog,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle
} from 'lucide-vue-next'

// Props
const props = defineProps<{
  settings?: any
}>()

// Emits
const emit = defineEmits<{
  close: []
  settingsChanged: [settings: any]
}>()

// 响应式数据
const showResetConfirm = ref(false)
const fileInput = ref<HTMLInputElement>()

// 设置数据
const settings = reactive({
  voice: {
    enabled: true,
    speed: 1.0,
    volume: 0.8,
    autoPlay: true
  },
  ui: {
    theme: 'dark',
    fontSize: 14,
    animations: true,
    compactMode: false
  },
  chat: {
    typewriterEffect: true,
    typewriterSpeed: 50,
    autoScroll: true,
    sendShortcut: 'enter'
  },
  personality: {
    autoSwitch: true,
    emotionDetection: true,
    defaultPersonality: 'angel'
  },
  memory: {
    autoUnlock: true,
    unlockNotifications: true
  },
  advanced: {
    developerMode: false,
    debugLogs: false,
    performanceMonitoring: false
  }
})

// 方法
const toggleTTS = () => {
  settings.voice.enabled = !settings.voice.enabled
  updateVoiceSettings()
}

const setTheme = (theme: 'dark' | 'light') => {
  settings.ui.theme = theme
  updateUISettings()
}

const updateVoiceSettings = () => {
  emit('settingsChanged', { type: 'voice', settings: settings.voice })
}

const updateUISettings = () => {
  emit('settingsChanged', { type: 'ui', settings: settings.ui })
}

const updateChatSettings = () => {
  emit('settingsChanged', { type: 'chat', settings: settings.chat })
}

const updatePersonalitySettings = () => {
  emit('settingsChanged', { type: 'personality', settings: settings.personality })
}

const updateMemorySettings = () => {
  emit('settingsChanged', { type: 'memory', settings: settings.memory })
}

const updateAdvancedSettings = () => {
  emit('settingsChanged', { type: 'advanced', settings: settings.advanced })
}

const exportSettings = () => {
  const dataStr = JSON.stringify(settings, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `ai-chat-settings-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

const importSettings = () => {
  fileInput.value?.click()
}

const handleFileImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedSettings = JSON.parse(e.target?.result as string)
      
      // 合并设置
      Object.assign(settings, importedSettings)
      
      // 通知所有设置更改
      emit('settingsChanged', { type: 'all', settings })
      
      // 重置文件输入
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    } catch (error) {
      console.error('导入设置失败:', error)
      // 这里可以添加错误提示
    }
  }
  reader.readAsText(file)
}

const resetSettings = () => {
  // 重置为默认值
  Object.assign(settings, {
    voice: {
      enabled: true,
      speed: 1.0,
      volume: 0.8,
      autoPlay: true
    },
    ui: {
      theme: 'dark',
      fontSize: 14,
      animations: true,
      compactMode: false
    },
    chat: {
      typewriterEffect: true,
      typewriterSpeed: 50,
      autoScroll: true,
      sendShortcut: 'enter'
    },
    personality: {
      autoSwitch: true,
      emotionDetection: true,
      defaultPersonality: 'angel'
    },
    memory: {
      autoUnlock: true,
      unlockNotifications: true
    },
    advanced: {
      developerMode: false,
      debugLogs: false,
      performanceMonitoring: false
    }
  })

  showResetConfirm.value = false
  emit('settingsChanged', { type: 'all', settings })
}

// 初始化设置
const initSettings = () => {
  try {
    // 优先使用props中的设置
    if (props.settings) {
      // 将全局设置映射到本地设置格式
      settings.personality.defaultPersonality = props.settings.preferredPersonality || 'angel'
      settings.personality.autoSwitch = props.settings.allowPersonalitySwitch !== false
      settings.voice.enabled = props.settings.enableTTS !== false
      settings.voice.volume = (props.settings.volume || 80) / 100
      settings.voice.autoPlay = props.settings.autoPlay !== false
      settings.ui.theme = props.settings.theme || 'dark'
      settings.ui.fontSize = props.settings.fontSize === 'small' ? 12 : props.settings.fontSize === 'large' ? 18 : 14
      settings.chat.typewriterEffect = props.settings.enableTypingIndicator !== false
      settings.chat.autoScroll = props.settings.autoSaveSession !== false
      settings.advanced.developerMode = props.settings.debugMode === true
    } else {
      // 从本地存储加载
      const savedSettings = localStorage.getItem('ai-chat-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        Object.assign(settings, parsed)
      }
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 组件挂载时初始化
initSettings()
</script>

<style scoped>
/* 滑块样式 */
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-webkit-slider-track {
  height: 8px;
  border-radius: 4px;
  background: #4b5563;
}

.slider::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: #4b5563;
}

/* 滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* 开关动画 */
.relative.inline-flex {
  transition: background-color 0.2s ease;
}

.inline-block.transform {
  transition: transform 0.2s ease;
}

/* 按钮悬停效果 */
button {
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

/* 模态框动画 */
.fixed {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.bg-gray-800 {
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 设置项动画 */
.space-y-4 > div {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>