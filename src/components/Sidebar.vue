<template>
  <div class="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
    <!-- 顶部标题和新建按钮 -->
    <div class="p-4 border-b border-gray-700">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-xl font-bold text-white flex items-center">
          <MessageCircle class="h-6 w-6 mr-2 text-blue-400" />
          对话记录
        </h1>
        <button
          @click="$emit('newSession')"
          class="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors group"
          title="新建对话"
        >
          <Plus class="h-5 w-5 text-white group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>
      
      <!-- 搜索框 -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索对话..."
          class="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="filteredSessions.length === 0" class="p-4 text-center text-gray-500">
        <MessageSquare class="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p class="text-sm">{{ searchQuery ? '没有找到匹配的对话' : '还没有对话记录' }}</p>
        <p v-if="!searchQuery" class="text-xs mt-1">点击上方按钮开始新对话</p>
      </div>

      <div v-else class="p-2 space-y-1">
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          @click="$emit('selectSession', session.id)"
          class="group relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-700"
          :class="{
            'bg-gray-700 border-l-4 border-blue-500': session.id === currentSessionId,
            'hover:bg-gray-750': session.id !== currentSessionId
          }"
        >
          <!-- 会话内容 -->
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <!-- 标题 -->
              <h3 class="text-white font-medium text-sm truncate mb-1">
                {{ session.title }}
              </h3>
              
              <!-- 最后一条消息 -->
              <p v-if="session.lastMessage" class="text-gray-400 text-xs truncate mb-2">
                {{ session.lastMessage }}
              </p>
              
              <!-- 底部信息 -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center space-x-2">
                  <!-- 人格标识 -->
                  <span
                    v-if="session.lastPersonality"
                    class="px-2 py-1 rounded-full text-xs font-medium"
                    :class="getPersonalityStyle(session.lastPersonality)"
                  >
                    {{ getPersonalityName(session.lastPersonality) }}
                  </span>
                  
                  <!-- 时间 -->
                  <span class="text-gray-500">
                    {{ formatTime(session.lastMessageTime || session.updated_at) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                @click.stop="editSession(session)"
                class="p-1 hover:bg-gray-600 rounded transition-colors"
                title="编辑标题"
              >
                <Edit3 class="h-4 w-4 text-gray-400" />
              </button>
              <button
                @click.stop="confirmDelete(session)"
                class="p-1 hover:bg-red-600 rounded transition-colors"
                title="删除对话"
              >
                <Trash2 class="h-4 w-4 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          </div>

          <!-- 活跃指示器 -->
          <div
            v-if="session.id === currentSessionId"
            class="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r"
          />
        </div>
      </div>
    </div>

    <!-- 底部统计信息 -->
    <div class="p-4 border-t border-gray-700 bg-gray-850">
      <div class="flex items-center justify-between text-xs text-gray-400">
        <span>共 {{ sessions.length }} 个对话</span>
        <div class="flex items-center space-x-2">
          <Clock class="h-4 w-4" />
          <span>{{ getActiveTime() }}</span>
        </div>
      </div>
    </div>

    <!-- 编辑对话标题模态框 -->
    <div
      v-if="editingSession"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="cancelEdit"
    >
      <div
        class="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700"
        @click.stop
      >
        <h3 class="text-lg font-medium text-white mb-4">编辑对话标题</h3>
        <input
          v-model="editTitle"
          type="text"
          class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="请输入新标题"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
          ref="editInput"
        />
        <div class="flex justify-end space-x-3 mt-4">
          <button
            @click="cancelEdit"
            class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            @click="saveEdit"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div
      v-if="deletingSession"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="cancelDelete"
    >
      <div
        class="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700"
        @click.stop
      >
        <div class="flex items-center mb-4">
          <AlertTriangle class="h-6 w-6 text-red-400 mr-3" />
          <h3 class="text-lg font-medium text-white">确认删除</h3>
        </div>
        <p class="text-gray-300 mb-6">
          确定要删除对话 "{{ deletingSession.title }}" 吗？此操作无法撤销。
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="cancelDelete"
            class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            @click="confirmDeleteSession"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  MessageCircle,
  Plus,
  Search,
  MessageSquare,
  Edit3,
  Trash2,
  Clock,
  AlertTriangle
} from 'lucide-vue-next'

// 接口定义
interface ChatSession {
  id: number
  user_id: number
  title: string
  lastMessage?: string
  lastMessageTime?: string
  lastPersonality?: string
  created_at: string
  updated_at: string
}

// Props
const props = defineProps<{
  sessions: ChatSession[]
  currentSessionId: string | null
}>()

// Emits
const emit = defineEmits<{
  selectSession: [sessionId: string]
  newSession: []
  deleteSession: [sessionId: string]
  updateSession: [sessionId: string, data: { title: string }]
}>()

// 响应式数据
const searchQuery = ref('')
const editingSession = ref<ChatSession | null>(null)
const editTitle = ref('')
const deletingSession = ref<ChatSession | null>(null)
const editInput = ref<HTMLInputElement>()

// 计算属性
const filteredSessions = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.sessions
  }
  
  const query = searchQuery.value.toLowerCase()
  return props.sessions.filter(session =>
    session.title.toLowerCase().includes(query) ||
    session.lastMessage?.toLowerCase().includes(query)
  )
})

// 方法
const formatTime = (timeString: string): string => {
  const time = new Date(timeString)
  const now = new Date()
  const diff = now.getTime() - time.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return time.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

const getPersonalityName = (personality: string): string => {
  const names: { [key: string]: string } = {
    default: '默认',
    tsundere: '傲娇',
    tech: '科技',
    healing: '治愈',
    defensive: '防御'
  }
  return names[personality] || personality
}

const getPersonalityStyle = (personality: string): string => {
  const styles: { [key: string]: string } = {
    default: 'bg-blue-500/20 text-blue-300',
    tsundere: 'bg-pink-500/20 text-pink-300',
    tech: 'bg-cyan-500/20 text-cyan-300',
    healing: 'bg-green-500/20 text-green-300',
    defensive: 'bg-orange-500/20 text-orange-300'
  }
  return styles[personality] || 'bg-gray-500/20 text-gray-300'
}

const getActiveTime = (): string => {
  const now = new Date()
  return now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const editSession = async (session: ChatSession) => {
  editingSession.value = session
  editTitle.value = session.title
  
  await nextTick()
  editInput.value?.focus()
  editInput.value?.select()
}

const saveEdit = () => {
  if (editingSession.value && editTitle.value.trim()) {
    emit('updateSession', editingSession.value.id, {
      title: editTitle.value.trim()
    })
  }
  cancelEdit()
}

const cancelEdit = () => {
  editingSession.value = null
  editTitle.value = ''
}

const confirmDelete = (session: ChatSession) => {
  deletingSession.value = session
}

const confirmDeleteSession = () => {
  if (deletingSession.value) {
    emit('deleteSession', deletingSession.value.id)
  }
  cancelDelete()
}

const cancelDelete = () => {
  deletingSession.value = null
}
</script>

<style scoped>
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

/* 会话项悬停效果 */
.group:hover .opacity-0 {
  opacity: 1;
}

/* 搜索框动画 */
input:focus {
  transform: scale(1.02);
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

/* 活跃会话指示器动画 */
.absolute.left-0 {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-50%) scaleY(0);
  }
  to {
    transform: translateY(-50%) scaleY(1);
  }
}
</style>