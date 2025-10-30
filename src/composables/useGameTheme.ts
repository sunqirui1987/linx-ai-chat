import { ref, computed, watch, readonly } from 'vue'

export interface GameTheme {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  border: string
  shadow: string
  gradient: string
  glow: string
}

export interface PersonalityTheme {
  demon: GameTheme
  angel: GameTheme
  neutral: GameTheme
}

const personalityThemes: PersonalityTheme = {
  demon: {
    primary: '#DC2626', // red-600
    secondary: '#991B1B', // red-800
    accent: '#FCA5A5', // red-300
    background: 'linear-gradient(135deg, #1F1F23 0%, #2D1B1B 100%)',
    surface: 'rgba(220, 38, 38, 0.1)',
    text: '#FEF2F2', // red-50
    border: 'rgba(220, 38, 38, 0.3)',
    shadow: '0 0 20px rgba(220, 38, 38, 0.3)',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
    glow: '0 0 30px rgba(220, 38, 38, 0.5)'
  },
  angel: {
    primary: '#2563EB', // blue-600
    secondary: '#1D4ED8', // blue-700
    accent: '#93C5FD', // blue-300
    background: 'linear-gradient(135deg, #1F1F23 0%, #1B2D3D 100%)',
    surface: 'rgba(37, 99, 235, 0.1)',
    text: '#EFF6FF', // blue-50
    border: 'rgba(37, 99, 235, 0.3)',
    shadow: '0 0 20px rgba(37, 99, 235, 0.3)',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    glow: '0 0 30px rgba(37, 99, 235, 0.5)'
  },
  neutral: {
    primary: '#6B7280', // gray-500
    secondary: '#4B5563', // gray-600
    accent: '#D1D5DB', // gray-300
    background: 'linear-gradient(135deg, #1F1F23 0%, #2D2D30 100%)',
    surface: 'rgba(107, 114, 128, 0.1)',
    text: '#F9FAFB', // gray-50
    border: 'rgba(107, 114, 128, 0.3)',
    shadow: '0 0 20px rgba(107, 114, 128, 0.3)',
    gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
    glow: '0 0 30px rgba(107, 114, 128, 0.5)'
  }
}

const currentPersonality = ref<keyof PersonalityTheme>('angel')
const isTransitioning = ref(false)
const transitionDuration = 1000 // ms

export function useGameTheme() {
  const currentTheme = computed(() => personalityThemes[currentPersonality.value])
  
  const switchPersonality = (newPersonality: keyof PersonalityTheme) => {
    if (newPersonality === currentPersonality.value) return
    
    isTransitioning.value = true
    currentPersonality.value = newPersonality
    
    // 触发页面级别的主题切换动画
    document.documentElement.style.setProperty('--theme-primary', currentTheme.value.primary)
    document.documentElement.style.setProperty('--theme-secondary', currentTheme.value.secondary)
    document.documentElement.style.setProperty('--theme-accent', currentTheme.value.accent)
    document.documentElement.style.setProperty('--theme-surface', currentTheme.value.surface)
    document.documentElement.style.setProperty('--theme-border', currentTheme.value.border)
    document.documentElement.style.setProperty('--theme-shadow', currentTheme.value.shadow)
    document.documentElement.style.setProperty('--theme-glow', currentTheme.value.glow)
    
    setTimeout(() => {
      isTransitioning.value = false
    }, transitionDuration)
  }
  
  const getPersonalityClass = (personality: keyof PersonalityTheme) => {
    const theme = personalityThemes[personality]
    return {
      'demon': 'theme-demon',
      'angel': 'theme-angel',
      'neutral': 'theme-neutral'
    }[personality]
  }
  
  const getGlowEffect = (personality: keyof PersonalityTheme, intensity: number = 1) => {
    const theme = personalityThemes[personality]
    return {
      boxShadow: theme.glow,
      filter: `brightness(${1 + intensity * 0.2})`
    }
  }
  
  const getParticleConfig = (personality: keyof PersonalityTheme) => {
    return {
      demon: {
        color: '#DC2626',
        count: 50,
        speed: 2,
        size: { min: 1, max: 3 },
        opacity: { min: 0.3, max: 0.8 },
        direction: 'up'
      },
      angel: {
        color: '#2563EB',
        count: 30,
        speed: 1,
        size: { min: 2, max: 4 },
        opacity: { min: 0.4, max: 0.9 },
        direction: 'float'
      },
      neutral: {
        color: '#6B7280',
        count: 20,
        speed: 0.5,
        size: { min: 1, max: 2 },
        opacity: { min: 0.2, max: 0.5 },
        direction: 'drift'
      }
    }[personality]
  }
  
  return {
    currentPersonality: readonly(currentPersonality),
    currentTheme,
    isTransitioning: readonly(isTransitioning),
    switchPersonality,
    getPersonalityClass,
    getGlowEffect,
    getParticleConfig,
    personalityThemes
  }
}