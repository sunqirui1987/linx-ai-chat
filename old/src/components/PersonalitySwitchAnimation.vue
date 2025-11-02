<template>
  <div class="personality-switch-container">
    <!-- 背景粒子效果 -->
    <div 
      v-if="isAnimating" 
      class="fixed inset-0 z-50 pointer-events-none overflow-hidden"
    >
      <!-- 粒子系统 -->
      <div class="particles-container">
        <div
          v-for="particle in particles"
          :key="particle.id"
          class="particle absolute rounded-full"
          :style="particle.style"
        />
      </div>
      
      <!-- 中央切换动画 -->
      <div class="flex items-center justify-center h-full">
        <div class="switch-animation-center">
          <!-- 旧角色消失动画 -->
          <div 
            v-if="oldPersonality"
            class="personality-avatar old-avatar"
            :class="getPersonalityClass(oldPersonality)"
          >
            <component :is="getPersonalityIcon(oldPersonality)" class="h-16 w-16" />
          </div>
          
          <!-- 能量波纹效果 -->
          <div class="energy-ripples">
            <div 
              v-for="i in 3" 
              :key="i" 
              class="ripple"
              :style="{ animationDelay: `${i * 0.2}s` }"
            />
          </div>
          
          <!-- 新角色出现动画 -->
          <div 
            v-if="newPersonality"
            class="personality-avatar new-avatar"
            :class="getPersonalityClass(newPersonality)"
          >
            <component :is="getPersonalityIcon(newPersonality)" class="h-16 w-16" />
          </div>
          
          <!-- 切换文字提示 -->
          <div class="switch-text">
            <div class="text-2xl font-bold text-white mb-2 animate-pulse">
              人格切换中...
            </div>
            <div class="text-lg text-gray-300">
              {{ getSwitchMessage() }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 屏幕边缘光效 -->
      <div class="screen-glow" :class="getPersonalityClass(newPersonality || 'neutral')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Heart, Zap } from 'lucide-vue-next'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  style: any
}

interface Props {
  isAnimating: boolean
  oldPersonality?: string
  newPersonality?: string
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  duration: 2000
})

const emit = defineEmits<{
  animationComplete: []
}>()

const particles = ref<Particle[]>([])
const animationFrame = ref<number>()

const getPersonalityIcon = (personality: string) => {
  return personality === 'demon' ? Zap : Heart
}

const getPersonalityClass = (personality: string) => {
  return {
    'demon': 'demon-theme',
    'angel': 'angel-theme',
    'neutral': 'neutral-theme'
  }[personality] || 'neutral-theme'
}

const getSwitchMessage = () => {
  if (!props.oldPersonality || !props.newPersonality) return ''
  
  const messages = {
    'angel-demon': '光明正在被黑暗吞噬...',
    'demon-angel': '黑暗中绽放出希望之光...',
    'neutral-demon': '内心的恶魔正在觉醒...',
    'neutral-angel': '天使的翅膀正在展开...'
  }
  
  const key = `${props.oldPersonality}-${props.newPersonality}` as keyof typeof messages
  return messages[key] || '人格正在转换...'
}

const createParticles = () => {
  particles.value = []
  const count = 100
  
  for (let i = 0; i < count; i++) {
    const particle: Particle = {
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: Math.random() * 4 + 1,
      opacity: Math.random() * 0.8 + 0.2,
      color: props.newPersonality === 'demon' ? '#DC2626' : '#2563EB',
      style: {}
    }
    
    updateParticleStyle(particle)
    particles.value.push(particle)
  }
}

const updateParticleStyle = (particle: Particle) => {
  particle.style = {
    left: `${particle.x}px`,
    top: `${particle.y}px`,
    width: `${particle.size}px`,
    height: `${particle.size}px`,
    backgroundColor: particle.color,
    opacity: particle.opacity,
    boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
    animation: `particle-float ${2 + Math.random() * 3}s infinite ease-in-out`
  }
}

const animateParticles = () => {
  particles.value.forEach(particle => {
    particle.x += particle.vx
    particle.y += particle.vy
    
    // 边界反弹
    if (particle.x <= 0 || particle.x >= window.innerWidth) {
      particle.vx *= -1
    }
    if (particle.y <= 0 || particle.y >= window.innerHeight) {
      particle.vy *= -1
    }
    
    // 透明度变化
    particle.opacity += (Math.random() - 0.5) * 0.02
    particle.opacity = Math.max(0.1, Math.min(1, particle.opacity))
    
    updateParticleStyle(particle)
  })
  
  if (props.isAnimating) {
    animationFrame.value = requestAnimationFrame(animateParticles)
  }
}

const startAnimation = () => {
  createParticles()
  animateParticles()
  
  // 动画完成后清理
  setTimeout(() => {
    if (animationFrame.value) {
      cancelAnimationFrame(animationFrame.value)
    }
    particles.value = []
    emit('animationComplete')
  }, props.duration)
}

watch(() => props.isAnimating, (newVal) => {
  if (newVal) {
    startAnimation()
  } else {
    if (animationFrame.value) {
      cancelAnimationFrame(animationFrame.value)
    }
    particles.value = []
  }
})

onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }
})
</script>

<style scoped>
.personality-switch-container {
  position: relative;
}

.particles-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.switch-animation-center {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.personality-avatar {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4px solid;
  backdrop-filter: blur(10px);
}

.old-avatar {
  animation: avatar-disappear 1s ease-in-out forwards;
}

.new-avatar {
  animation: avatar-appear 1s ease-in-out 1s forwards;
  opacity: 0;
  transform: scale(0);
}

.energy-ripples {
  position: absolute;
  width: 200px;
  height: 200px;
}

.ripple {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: ripple-expand 1.5s ease-out infinite;
}

.switch-text {
  position: absolute;
  top: 180px;
  text-align: center;
  white-space: nowrap;
}

.screen-glow {
  position: absolute;
  inset: 0;
  opacity: 0.3;
  animation: screen-pulse 2s ease-in-out;
}

/* 主题样式 */
.demon-theme {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.3), rgba(153, 27, 27, 0.3));
  border-color: #DC2626;
  box-shadow: 0 0 40px rgba(220, 38, 38, 0.6);
}

.angel-theme {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.3), rgba(29, 78, 216, 0.3));
  border-color: #2563EB;
  box-shadow: 0 0 40px rgba(37, 99, 235, 0.6);
}

.neutral-theme {
  background: linear-gradient(135deg, rgba(107, 114, 128, 0.3), rgba(75, 85, 99, 0.3));
  border-color: #6B7280;
  box-shadow: 0 0 40px rgba(107, 114, 128, 0.6);
}

/* 动画定义 */
@keyframes avatar-disappear {
  0% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2) rotate(180deg);
  }
  100% {
    opacity: 0;
    transform: scale(0) rotate(360deg);
  }
}

@keyframes avatar-appear {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-360deg);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2) rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes ripple-expand {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes screen-pulse {
  0%, 100% {
    opacity: 0;
  }
  50% {
    opacity: 0.3;
  }
}

@keyframes particle-float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}
</style>