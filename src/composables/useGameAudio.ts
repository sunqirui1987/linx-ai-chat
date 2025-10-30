import { ref, reactive } from 'vue'

interface AudioConfig {
  volume: number
  enabled: boolean
  backgroundMusicEnabled: boolean
  soundEffectsEnabled: boolean
}

interface SoundEffect {
  id: string
  name: string
  url?: string
  frequency?: number
  duration?: number
  type: 'generated' | 'file'
}

export function useGameAudio() {
  const audioConfig = reactive<AudioConfig>({
    volume: 0.7,
    enabled: true,
    backgroundMusicEnabled: true,
    soundEffectsEnabled: true
  })

  const audioContext = ref<AudioContext | null>(null)
  const backgroundMusic = ref<HTMLAudioElement | null>(null)
  const isPlaying = ref(false)

  // 音效定义
  const soundEffects: Record<string, SoundEffect> = {
    // 角色切换音效
    switchToDemon: {
      id: 'switchToDemon',
      name: '切换到恶魔',
      type: 'generated',
      frequency: 200,
      duration: 0.3
    },
    switchToAngel: {
      id: 'switchToAngel',
      name: '切换到天使',
      type: 'generated',
      frequency: 800,
      duration: 0.3
    },
    
    // 消息音效
    messageSent: {
      id: 'messageSent',
      name: '消息发送',
      type: 'generated',
      frequency: 600,
      duration: 0.1
    },
    messageReceived: {
      id: 'messageReceived',
      name: '消息接收',
      type: 'generated',
      frequency: 400,
      duration: 0.2
    },
    
    // 特殊事件音效
    memoryUnlocked: {
      id: 'memoryUnlocked',
      name: '记忆解锁',
      type: 'generated',
      frequency: 1000,
      duration: 0.5
    },
    moralityIncrease: {
      id: 'moralityIncrease',
      name: '道德值提升',
      type: 'generated',
      frequency: 700,
      duration: 0.3
    },
    moralityDecrease: {
      id: 'moralityDecrease',
      name: '道德值下降',
      type: 'generated',
      frequency: 300,
      duration: 0.3
    },
    
    // UI交互音效
    buttonClick: {
      id: 'buttonClick',
      name: '按钮点击',
      type: 'generated',
      frequency: 500,
      duration: 0.05
    },
    buttonHover: {
      id: 'buttonHover',
      name: '按钮悬停',
      type: 'generated',
      frequency: 450,
      duration: 0.03
    },
    
    // 特殊状态音效
    typing: {
      id: 'typing',
      name: '打字音效',
      type: 'generated',
      frequency: 350,
      duration: 0.02
    },
    notification: {
      id: 'notification',
      name: '通知音效',
      type: 'generated',
      frequency: 800,
      duration: 0.2
    }
  }

  // 初始化音频上下文
  const initAudioContext = () => {
    if (!audioContext.value) {
      audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext.value
  }

  // 生成音效
  const generateTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    const context = initAudioContext()
    if (!context || !audioConfig.enabled || !audioConfig.soundEffectsEnabled) return

    const oscillator = context.createOscillator()
    const gainNode = context.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(context.destination)

    oscillator.frequency.setValueAtTime(frequency, context.currentTime)
    oscillator.type = type

    // 音量包络
    gainNode.gain.setValueAtTime(0, context.currentTime)
    gainNode.gain.linearRampToValueAtTime(audioConfig.volume * 0.3, context.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)

    oscillator.start(context.currentTime)
    oscillator.stop(context.currentTime + duration)
  }

  // 播放复合音效（多个频率组合）
  const playComplexSound = (frequencies: number[], duration: number, type: OscillatorType = 'sine') => {
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        generateTone(freq, duration / frequencies.length, type)
      }, index * (duration * 1000) / frequencies.length)
    })
  }

  // 播放音效
  const playSound = (soundId: string) => {
    const sound = soundEffects[soundId]
    if (!sound || !audioConfig.enabled || !audioConfig.soundEffectsEnabled) return

    switch (soundId) {
      case 'switchToDemon':
        playComplexSound([400, 300, 200], 0.4, 'sawtooth')
        break
      
      case 'switchToAngel':
        playComplexSound([600, 800, 1000], 0.4, 'sine')
        break
      
      case 'memoryUnlocked':
        playComplexSound([500, 700, 900, 1200], 0.6, 'triangle')
        break
      
      case 'moralityIncrease':
        playComplexSound([400, 600, 800], 0.3, 'sine')
        break
      
      case 'moralityDecrease':
        playComplexSound([600, 400, 200], 0.3, 'sawtooth')
        break
      
      default:
        if (sound.frequency && sound.duration) {
          generateTone(sound.frequency, sound.duration)
        }
        break
    }
  }

  // 播放背景音乐
  const playBackgroundMusic = (url?: string) => {
    if (!audioConfig.enabled || !audioConfig.backgroundMusicEnabled) return

    // 如果没有提供URL，生成环境音效
    if (!url) {
      generateAmbientSound()
      return
    }

    if (backgroundMusic.value) {
      backgroundMusic.value.pause()
    }

    backgroundMusic.value = new Audio(url)
    backgroundMusic.value.loop = true
    backgroundMusic.value.volume = audioConfig.volume * 0.3
    
    backgroundMusic.value.play().then(() => {
      isPlaying.value = true
    }).catch(error => {
      console.warn('Background music playback failed:', error)
    })
  }

  // 生成环境音效
  const generateAmbientSound = () => {
    const context = initAudioContext()
    if (!context || !audioConfig.enabled || !audioConfig.backgroundMusicEnabled) return

    // 创建低频环境音
    const createAmbientOscillator = (frequency: number, volume: number) => {
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      const filter = context.createBiquadFilter()

      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(context.destination)

      oscillator.frequency.setValueAtTime(frequency, context.currentTime)
      oscillator.type = 'sine'
      
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(200, context.currentTime)
      
      gainNode.gain.setValueAtTime(volume * audioConfig.volume * 0.1, context.currentTime)

      oscillator.start()
      
      // 添加轻微的频率调制
      const lfo = context.createOscillator()
      const lfoGain = context.createGain()
      
      lfo.connect(lfoGain)
      lfoGain.connect(oscillator.frequency)
      
      lfo.frequency.setValueAtTime(0.1, context.currentTime)
      lfoGain.gain.setValueAtTime(2, context.currentTime)
      
      lfo.start()

      return { oscillator, lfo }
    }

    // 创建多层环境音
    createAmbientOscillator(60, 0.3)   // 低频基础
    createAmbientOscillator(120, 0.2)  // 中低频
    createAmbientOscillator(180, 0.1)  // 中频
  }

  // 停止背景音乐
  const stopBackgroundMusic = () => {
    if (backgroundMusic.value) {
      backgroundMusic.value.pause()
      backgroundMusic.value.currentTime = 0
      isPlaying.value = false
    }
  }

  // 设置音量
  const setVolume = (volume: number) => {
    audioConfig.volume = Math.max(0, Math.min(1, volume))
    if (backgroundMusic.value) {
      backgroundMusic.value.volume = audioConfig.volume * 0.3
    }
  }

  // 切换音效开关
  const toggleSoundEffects = () => {
    audioConfig.soundEffectsEnabled = !audioConfig.soundEffectsEnabled
  }

  // 切换背景音乐开关
  const toggleBackgroundMusic = () => {
    audioConfig.backgroundMusicEnabled = !audioConfig.backgroundMusicEnabled
    if (!audioConfig.backgroundMusicEnabled) {
      stopBackgroundMusic()
    } else {
      playBackgroundMusic()
    }
  }

  // 切换总开关
  const toggleAudio = () => {
    audioConfig.enabled = !audioConfig.enabled
    if (!audioConfig.enabled) {
      stopBackgroundMusic()
    }
  }

  // 播放角色特定的环境音
  const playPersonalityAmbient = (personality: 'demon' | 'angel' | 'neutral') => {
    const context = initAudioContext()
    if (!context || !audioConfig.enabled || !audioConfig.backgroundMusicEnabled) return

    stopBackgroundMusic()

    switch (personality) {
      case 'demon':
        // 恶魔：低沉、不和谐的音效
        generateAmbientSound()
        setTimeout(() => {
          playComplexSound([100, 150, 200], 2, 'sawtooth')
        }, 1000)
        break
      
      case 'angel':
        // 天使：高频、和谐的音效
        generateAmbientSound()
        setTimeout(() => {
          playComplexSound([400, 600, 800], 2, 'sine')
        }, 1000)
        break
      
      default:
        // 中性：平衡的环境音
        generateAmbientSound()
        break
    }
  }

  // 播放打字音效序列
  const playTypingSequence = (duration: number = 2000) => {
    if (!audioConfig.enabled || !audioConfig.soundEffectsEnabled) return

    const interval = 100 // 每100ms一个打字音
    const count = duration / interval

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        generateTone(350 + Math.random() * 50, 0.02, 'square')
      }, i * interval)
    }
  }

  // 播放通知音效
  const playNotification = (type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const frequencies = {
      success: [600, 800, 1000],
      warning: [400, 600, 400],
      error: [300, 200, 100],
      info: [500, 700, 500]
    }

    playComplexSound(frequencies[type], 0.4, 'triangle')
  }

  return {
    audioConfig,
    isPlaying,
    playSound,
    playBackgroundMusic,
    stopBackgroundMusic,
    generateAmbientSound,
    playPersonalityAmbient,
    playTypingSequence,
    playNotification,
    setVolume,
    toggleSoundEffects,
    toggleBackgroundMusic,
    toggleAudio,
    initAudioContext
  }
}