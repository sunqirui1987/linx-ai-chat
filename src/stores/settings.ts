import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

interface UserSettings {
  // 语音设置
  enableTTS: boolean
  volume: number
  autoPlay: boolean
  
  // 界面设置
  theme: 'dark' | 'light'
  fontSize: 'small' | 'medium' | 'large'
  showTimestamp: boolean
  showPersonality: boolean
  
  // 聊天设置
  enableTypingIndicator: boolean
  enableNotifications: boolean
  autoSaveSession: boolean
  maxSessionHistory: number
  
  // 人格设置
  preferredPersonality: string
  allowPersonalitySwitch: boolean
  personalityTriggerSensitivity: 'low' | 'medium' | 'high'
  
  // 记忆设置
  showMemoryHints: boolean
  enableMemoryNotifications: boolean
  
  // 高级设置
  debugMode: boolean
  apiTimeout: number
}

const DEFAULT_SETTINGS: UserSettings = {
  // 语音设置
  enableTTS: true,
  volume: 80,
  autoPlay: true,
  
  // 界面设置
  theme: 'dark',
  fontSize: 'medium',
  showTimestamp: true,
  showPersonality: true,
  
  // 聊天设置
  enableTypingIndicator: true,
  enableNotifications: true,
  autoSaveSession: true,
  maxSessionHistory: 100,
  
  // 人格设置
  preferredPersonality: 'default',
  allowPersonalitySwitch: true,
  personalityTriggerSensitivity: 'medium',
  
  // 记忆设置
  showMemoryHints: true,
  enableMemoryNotifications: true,
  
  // 高级设置
  debugMode: false,
  apiTimeout: 30000
}

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS })
  const isLoading = ref(false)

  // 从本地存储加载设置
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('user_settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        settings.value = { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      settings.value = { ...DEFAULT_SETTINGS }
    }
  }

  // 保存设置到本地存储
  const saveSettings = () => {
    try {
      localStorage.setItem('user_settings', JSON.stringify(settings.value))
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  // 更新设置
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    settings.value = { ...settings.value, ...newSettings }
    saveSettings()
  }

  // 重置设置
  const resetSettings = () => {
    settings.value = { ...DEFAULT_SETTINGS }
    saveSettings()
  }

  // 获取特定设置
  const getSetting = <K extends keyof UserSettings>(key: K): UserSettings[K] => {
    return settings.value[key]
  }

  // 设置特定值
  const setSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    settings.value[key] = value
    saveSettings()
  }

  // 切换布尔值设置
  const toggleSetting = (key: keyof UserSettings) => {
    if (typeof settings.value[key] === 'boolean') {
      ;(settings.value[key] as boolean) = !(settings.value[key] as boolean)
      saveSettings()
    }
  }

  // 导出设置
  const exportSettings = (): string => {
    return JSON.stringify(settings.value, null, 2)
  }

  // 导入设置
  const importSettings = (settingsJson: string): boolean => {
    try {
      const imported = JSON.parse(settingsJson)
      
      // 验证导入的设置格式
      const validKeys = Object.keys(DEFAULT_SETTINGS)
      const importedKeys = Object.keys(imported)
      
      // 只导入有效的设置项
      const validSettings: Partial<UserSettings> = {}
      importedKeys.forEach(key => {
        if (validKeys.includes(key)) {
          validSettings[key as keyof UserSettings] = imported[key]
        }
      })
      
      updateSettings(validSettings)
      return true
    } catch (error) {
      console.error('导入设置失败:', error)
      return false
    }
  }

  // 获取主题相关的CSS变量
  const getThemeVariables = () => {
    const theme = settings.value.theme
    const fontSize = settings.value.fontSize
    
    const variables: { [key: string]: string } = {}
    
    // 主题颜色
    if (theme === 'dark') {
      variables['--bg-primary'] = '#111827'
      variables['--bg-secondary'] = '#1f2937'
      variables['--bg-tertiary'] = '#374151'
      variables['--text-primary'] = '#f9fafb'
      variables['--text-secondary'] = '#d1d5db'
      variables['--text-tertiary'] = '#9ca3af'
      variables['--border-color'] = '#4b5563'
      variables['--accent-color'] = '#3b82f6'
    } else {
      variables['--bg-primary'] = '#ffffff'
      variables['--bg-secondary'] = '#f9fafb'
      variables['--bg-tertiary'] = '#f3f4f6'
      variables['--text-primary'] = '#111827'
      variables['--text-secondary'] = '#374151'
      variables['--text-tertiary'] = '#6b7280'
      variables['--border-color'] = '#d1d5db'
      variables['--accent-color'] = '#3b82f6'
    }
    
    // 字体大小
    switch (fontSize) {
      case 'small':
        variables['--font-size-base'] = '14px'
        variables['--font-size-sm'] = '12px'
        variables['--font-size-lg'] = '16px'
        break
      case 'large':
        variables['--font-size-base'] = '18px'
        variables['--font-size-sm'] = '16px'
        variables['--font-size-lg'] = '20px'
        break
      default: // medium
        variables['--font-size-base'] = '16px'
        variables['--font-size-sm'] = '14px'
        variables['--font-size-lg'] = '18px'
    }
    
    return variables
  }

  // 应用主题变量到DOM
  const applyTheme = () => {
    const variables = getThemeVariables()
    const root = document.documentElement
    
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    
    // 更新body类名
    document.body.className = `theme-${settings.value.theme} font-${settings.value.fontSize}`
  }

  // 监听设置变化，自动应用主题
  watch(
    () => [settings.value.theme, settings.value.fontSize],
    () => {
      applyTheme()
    },
    { immediate: true }
  )

  // 初始化
  loadSettings()

  return {
    // 状态
    settings,
    isLoading,
    
    // 方法
    loadSettings,
    saveSettings,
    updateSettings,
    resetSettings,
    getSetting,
    setSetting,
    toggleSetting,
    exportSettings,
    importSettings,
    getThemeVariables,
    applyTheme
  }
})