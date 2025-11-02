<template>
  <div class="bg-gray-800 border-b border-gray-700 p-3">
    <div class="max-w-4xl mx-auto flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <!-- AI头像和状态 -->
        <div class="flex items-center space-x-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center"
            :class="getPersonalityAvatarStyle(currentPersonality)"
          >
            <component :is="getPersonalityIcon(currentPersonality)" class="h-5 w-5" />
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-white font-medium">RZ-07 七崽</span>
              <span
                class="px-2 py-1 rounded-full text-xs font-medium"
                :class="getPersonalityBadgeStyle(currentPersonality)"
              >
                {{ getPersonalityName(currentPersonality) }}
              </span>
            </div>
            <div class="text-xs text-gray-400">
              {{ getPersonalityStatus(currentPersonality) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 好感度和记忆进度 -->
      <div class="flex items-center space-x-4">
        <div class="text-right">
          <div class="text-xs text-gray-400">好感度</div>
          <div class="flex items-center space-x-1">
            <span v-for="i in 5" :key="i" class="text-sm">
              {{ i <= favorabilityLevel ? '★' : '☆' }}
            </span>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-400">记忆片段</div>
          <div class="text-sm text-blue-400">{{ unlockedMemories }}/20</div>
        </div>
      </div>
    </div>

    <!-- 人格切换提示 -->
    <div
      v-if="personalityChangeNotification"
      class="max-w-4xl mx-auto mt-3 p-3 bg-blue-900/50 border border-blue-700 rounded-lg flex items-center space-x-3 animate-fade-in"
    >
      <Sparkles class="h-5 w-5 text-blue-400" />
      <div class="flex-1">
        <div class="text-blue-300 text-sm font-medium">
          人格模式已切换
        </div>
        <div class="text-blue-400 text-xs">
          {{ personalityChangeNotification.message }}
        </div>
      </div>
      <button
        @click="$emit('closeNotification')"
        class="text-blue-400 hover:text-blue-300 transition-colors"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, X } from 'lucide-vue-next'
import { 
  getPersonalityIcon,
  getPersonalityAvatarStyle,
  getPersonalityBadgeStyle,
  getPersonalityName,
  getPersonalityStatus
} from '@/config/personality'

interface PersonalityChangeNotification {
  message: string
  timestamp: Date
}

interface Props {
  currentPersonality: string
  favorabilityLevel: number
  unlockedMemories: number
  personalityChangeNotification: PersonalityChangeNotification | null
}

defineProps<Props>()

defineEmits<{
  closeNotification: []
}>()
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>