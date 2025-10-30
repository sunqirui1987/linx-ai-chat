<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <TransitionGroup
        name="toast"
        tag="div"
        class="space-y-2"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="max-w-sm w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden"
          :class="getNotificationStyle(notification.type)"
        >
          <div class="p-4">
            <div class="flex items-start">
              <!-- 图标 -->
              <div class="flex-shrink-0">
                <component
                  :is="getNotificationIcon(notification.type)"
                  class="h-5 w-5"
                  :class="getIconColor(notification.type)"
                />
              </div>

              <!-- 内容 -->
              <div class="ml-3 flex-1">
                <div class="text-sm font-medium text-white">
                  {{ notification.title }}
                </div>
                <div v-if="notification.message" class="mt-1 text-sm text-gray-300">
                  {{ notification.message }}
                </div>
                
                <!-- 记忆解锁特殊内容 -->
                <div v-if="notification.type === 'memory' && notification.data" class="mt-2">
                  <div class="text-xs text-purple-300 mb-1">新记忆片段</div>
                  <div class="bg-gray-700 rounded p-2 text-xs text-gray-200">
                    {{ notification.data.title }}
                  </div>
                </div>

                <!-- 人格切换特殊内容 -->
                <div v-if="notification.type === 'personality' && notification.data" class="mt-2">
                  <div class="flex items-center space-x-2 text-xs">
                    <span class="text-gray-400">切换至:</span>
                    <span class="text-pink-300 font-medium">{{ getPersonalityName(notification.data.personality) }}</span>
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div v-if="notification.actions && notification.actions.length > 0" class="mt-3 flex space-x-2">
                  <button
                    v-for="action in notification.actions"
                    :key="action.label"
                    @click="handleAction(notification, action)"
                    class="text-xs px-2 py-1 rounded transition-colors"
                    :class="action.primary ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-gray-200'"
                  >
                    {{ action.label }}
                  </button>
                </div>
              </div>

              <!-- 关闭按钮 -->
              <div class="ml-4 flex-shrink-0">
                <button
                  @click="removeNotification(notification.id)"
                  class="inline-flex text-gray-400 hover:text-gray-200 focus:outline-none transition-colors"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- 进度条 -->
          <div
            v-if="notification.duration && notification.duration > 0"
            class="h-1 bg-gray-700"
          >
            <div
              class="h-full transition-all ease-linear"
              :class="getProgressBarColor(notification.type)"
              :style="{ width: `${getProgress(notification)}%` }"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Brain,
  Users,
  Volume2,
  X
} from 'lucide-vue-next'

// 通知类型定义
interface NotificationAction {
  label: string
  action: string
  primary?: boolean
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'memory' | 'personality' | 'voice'
  title: string
  message?: string
  duration?: number
  actions?: NotificationAction[]
  data?: any
  createdAt: number
}

// 响应式数据
const notifications = ref<Notification[]>()

// 定时器映射
const timers = new Map<string, NodeJS.Timeout>()

// 方法
const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
  const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
  const newNotification: Notification = {
    ...notification,
    id,
    createdAt: Date.now(),
    duration: notification.duration ?? 5000
  }

  notifications.value.push(newNotification)

  // 设置自动移除定时器
  if (newNotification.duration && newNotification.duration > 0) {
    const timer = setTimeout(() => {
      removeNotification(id)
    }, newNotification.duration)
    timers.set(id, timer)
  }

  return id
}

const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }

  // 清除定时器
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

const clearAllNotifications = () => {
  notifications.value = []
  timers.forEach(timer => clearTimeout(timer))
  timers.clear()
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return CheckCircle
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    case 'memory':
      return Brain
    case 'personality':
      return Users
    case 'voice':
      return Volume2
    default:
      return Info
  }
}

const getNotificationStyle = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return 'border-l-4 border-l-green-500'
    case 'error':
      return 'border-l-4 border-l-red-500'
    case 'warning':
      return 'border-l-4 border-l-yellow-500'
    case 'info':
      return 'border-l-4 border-l-blue-500'
    case 'memory':
      return 'border-l-4 border-l-purple-500'
    case 'personality':
      return 'border-l-4 border-l-pink-500'
    case 'voice':
      return 'border-l-4 border-l-indigo-500'
    default:
      return 'border-l-4 border-l-gray-500'
  }
}

const getIconColor = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return 'text-green-400'
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-yellow-400'
    case 'info':
      return 'text-blue-400'
    case 'memory':
      return 'text-purple-400'
    case 'personality':
      return 'text-pink-400'
    case 'voice':
      return 'text-indigo-400'
    default:
      return 'text-gray-400'
  }
}

const getProgressBarColor = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return 'bg-green-500'
    case 'error':
      return 'bg-red-500'
    case 'warning':
      return 'bg-yellow-500'
    case 'info':
      return 'bg-blue-500'
    case 'memory':
      return 'bg-purple-500'
    case 'personality':
      return 'bg-pink-500'
    case 'voice':
      return 'bg-indigo-500'
    default:
      return 'bg-gray-500'
  }
}

const getProgress = (notification: Notification): number => {
  if (!notification.duration || notification.duration <= 0) return 100

  const elapsed = Date.now() - notification.createdAt
  const progress = Math.max(0, 100 - (elapsed / notification.duration) * 100)
  return progress
}

const getPersonalityName = (personality: string): string => {
  const names: { [key: string]: string } = {
    default: '默认痞帅',
    tsundere: '傲娇模式',
    tech: '科技高冷',
    warm: '治愈暖心',
    defensive: '防御模式'
  }
  return names[personality] || personality
}

const handleAction = (notification: Notification, action: NotificationAction) => {
  // 发送自定义事件
  window.dispatchEvent(new CustomEvent('notification-action', {
    detail: {
      notificationId: notification.id,
      action: action.action,
      data: notification.data
    }
  }))

  // 移除通知
  removeNotification(notification.id)
}

// 预定义的通知方法
const showSuccess = (title: string, message?: string, duration?: number) => {
  return addNotification({
    type: 'success',
    title,
    message,
    duration
  })
}

const showError = (title: string, message?: string, duration?: number) => {
  return addNotification({
    type: 'error',
    title,
    message,
    duration: duration ?? 8000 // 错误消息显示更久
  })
}

const showWarning = (title: string, message?: string, duration?: number) => {
  return addNotification({
    type: 'warning',
    title,
    message,
    duration
  })
}

const showInfo = (title: string, message?: string, duration?: number) => {
  return addNotification({
    type: 'info',
    title,
    message,
    duration
  })
}

const showMemoryUnlock = (memoryFragment: any, duration?: number) => {
  return addNotification({
    type: 'memory',
    title: '记忆解锁',
    message: '你解锁了一个新的记忆片段！',
    duration: duration ?? 8000,
    data: memoryFragment,
    actions: [
      { label: '查看', action: 'view-memory', primary: true },
      { label: '稍后', action: 'dismiss' }
    ]
  })
}

const showPersonalitySwitch = (personality: string, reason?: string, duration?: number) => {
  return addNotification({
    type: 'personality',
    title: '人格切换',
    message: reason || '根据对话情境自动切换人格',
    duration: duration ?? 6000,
    data: { personality }
  })
}

const showVoiceStatus = (status: 'playing' | 'stopped' | 'error', message?: string, duration?: number) => {
  const titles = {
    playing: '语音播放',
    stopped: '语音停止',
    error: '语音错误'
  }

  return addNotification({
    type: 'voice',
    title: titles[status],
    message,
    duration: duration ?? 3000
  })
}

// 暴露方法给父组件
defineExpose({
  addNotification,
  removeNotification,
  clearAllNotifications,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showMemoryUnlock,
  showPersonalitySwitch,
  showVoiceStatus
})

// 清理定时器
onUnmounted(() => {
  timers.forEach(timer => clearTimeout(timer))
  timers.clear()
})
</script>

<style scoped>
/* Toast 进入/离开动画 */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.3s ease-in;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-move {
  transition: transform 0.3s ease;
}

/* 悬停效果 */
.max-w-sm:hover {
  transform: translateX(-4px);
  transition: transform 0.2s ease;
}

/* 进度条动画 */
.h-full {
  transition: width linear;
}

/* 按钮悬停效果 */
button {
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

/* 图标动画 */
.flex-shrink-0 svg {
  transition: transform 0.2s ease;
}

.max-w-sm:hover .flex-shrink-0 svg {
  transform: scale(1.1);
}

/* 阴影效果 */
.shadow-lg {
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
}

.max-w-sm:hover {
  box-shadow: 0 20px 40px -4px rgba(0, 0, 0, 0.4), 0 8px 16px -4px rgba(0, 0, 0, 0.2);
}

/* 特殊类型通知的背景渐变 */
.border-l-purple-500 {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(31, 41, 55, 1) 100%);
}

.border-l-pink-500 {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(31, 41, 55, 1) 100%);
}

.border-l-green-500 {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(31, 41, 55, 1) 100%);
}

.border-l-red-500 {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(31, 41, 55, 1) 100%);
}

.border-l-yellow-500 {
  background: linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(31, 41, 55, 1) 100%);
}

.border-l-blue-500 {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(31, 41, 55, 1) 100%);
}

.border-l-indigo-500 {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(31, 41, 55, 1) 100%);
}
</style>