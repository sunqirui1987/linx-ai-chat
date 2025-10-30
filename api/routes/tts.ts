import express from 'express'
import { ttsService } from '../services/ttsService'

const router = express.Router()

// 生成语音
router.post('/generate', async (req, res) => {
  try {
    const { text, personality = 'default', voice, speed, pitch } = req.body

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Text is required for TTS generation'
      })
    }

    const result = await ttsService.generateSpeech({
      text: text.trim(),
      personality,
      voice,
      speed,
      pitch
    })

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to generate speech'
      })
    }

    res.json({
      success: true,
      data: {
        audioUrl: result.audioUrl,
        duration: result.duration,
        cached: result.cached
      }
    })
  } catch (error) {
    console.error('Error generating TTS:', error)
    res.status(500).json({
      error: 'Failed to generate speech'
    })
  }
})

// 批量生成语音
router.post('/generate/batch', async (req, res) => {
  try {
    const { texts, personality = 'default' } = req.body

    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({
        error: 'Texts array is required'
      })
    }

    const results = await ttsService.batchGenerateSpeech(texts, personality)

    res.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Error batch generating TTS:', error)
    res.status(500).json({
      error: 'Failed to batch generate speech'
    })
  }
})

// 获取可用声音列表
router.get('/voices', async (req, res) => {
  try {
    const voices = await ttsService.getAvailableVoices()

    res.json({
      success: true,
      data: voices
    })
  } catch (error) {
    console.error('Error getting available voices:', error)
    res.status(500).json({
      error: 'Failed to get available voices'
    })
  }
})

// 获取人格语音参数
router.get('/personalities/:personalityId/voice', async (req, res) => {
  try {
    const { personalityId } = req.params

    const voiceParams = ttsService.getPersonalityVoiceParams(personalityId)

    if (!voiceParams) {
      return res.status(404).json({
        error: 'Personality voice parameters not found'
      })
    }

    res.json({
      success: true,
      data: voiceParams
    })
  } catch (error) {
    console.error('Error getting personality voice params:', error)
    res.status(500).json({
      error: 'Failed to get personality voice parameters'
    })
  }
})

// 更新人格语音参数
router.put('/personalities/:personalityId/voice', async (req, res) => {
  try {
    const { personalityId } = req.params
    const voiceParams = req.body

    if (!voiceParams) {
      return res.status(400).json({
        error: 'Voice parameters are required'
      })
    }

    const success = ttsService.updatePersonalityVoice(personalityId, voiceParams)

    if (!success) {
      return res.status(404).json({
        error: 'Personality not found'
      })
    }

    res.json({
      success: true,
      message: 'Personality voice parameters updated'
    })
  } catch (error) {
    console.error('Error updating personality voice params:', error)
    res.status(500).json({
      error: 'Failed to update personality voice parameters'
    })
  }
})

// 测试TTS
router.post('/test', async (req, res) => {
  try {
    const { text = '这是一个测试语音', personality = 'default' } = req.body

    const result = await ttsService.testTTS(text, personality)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error testing TTS:', error)
    res.status(500).json({
      error: 'Failed to test TTS'
    })
  }
})

// 获取缓存统计
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await ttsService.getCacheStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting cache stats:', error)
    res.status(500).json({
      error: 'Failed to get cache stats'
    })
  }
})

// 清理缓存
router.post('/cache/clear', async (req, res) => {
  try {
    const { olderThan } = req.body

    const result = await ttsService.clearCache(olderThan)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
    res.status(500).json({
      error: 'Failed to clear cache'
    })
  }
})

// 获取TTS配置
router.get('/config', async (req, res) => {
  try {
    const config = ttsService.getConfig()

    res.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Error getting TTS config:', error)
    res.status(500).json({
      error: 'Failed to get TTS config'
    })
  }
})

// 更新TTS配置
router.put('/config', async (req, res) => {
  try {
    const config = req.body

    if (!config) {
      return res.status(400).json({
        error: 'Configuration is required'
      })
    }

    ttsService.updateConfig(config)

    res.json({
      success: true,
      message: 'TTS configuration updated'
    })
  } catch (error) {
    console.error('Error updating TTS config:', error)
    res.status(500).json({
      error: 'Failed to update TTS config'
    })
  }
})

// 预热缓存
router.post('/cache/warmup', async (req, res) => {
  try {
    const { texts, personalities } = req.body

    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({
        error: 'Texts array is required'
      })
    }

    const results = []

    for (const personality of (personalities || ['default'])) {
      for (const text of texts) {
        try {
          const result = await ttsService.generateSpeech({
            text,
            personality
          })
          results.push({
            text,
            personality,
            success: result.success,
            cached: result.cached
          })
        } catch (error) {
          results.push({
            text,
            personality,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    res.json({
      success: true,
      message: 'Cache warmup completed',
      data: results
    })
  } catch (error) {
    console.error('Error warming up cache:', error)
    res.status(500).json({
      error: 'Failed to warmup cache'
    })
  }
})

// 获取音频文件信息
router.get('/audio/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params

    // 这里可以实现获取音频文件信息的逻辑
    // 暂时返回基础信息
    res.json({
      success: true,
      data: {
        filename,
        url: `/api/tts/audio/${filename}`,
        exists: true // 实际应该检查文件是否存在
      }
    })
  } catch (error) {
    console.error('Error getting audio info:', error)
    res.status(500).json({
      error: 'Failed to get audio info'
    })
  }
})

// 删除音频文件
router.delete('/audio/:filename', async (req, res) => {
  try {
    const { filename } = req.params

    // 这里可以实现删除音频文件的逻辑
    // 暂时返回成功响应
    res.json({
      success: true,
      message: 'Audio file deleted'
    })
  } catch (error) {
    console.error('Error deleting audio file:', error)
    res.status(500).json({
      error: 'Failed to delete audio file'
    })
  }
})

// 健康检查
router.get('/health', async (req, res) => {
  try {
    // 测试TTS服务是否正常
    const testResult = await ttsService.testTTS('健康检查', 'default')

    res.json({
      success: true,
      data: {
        status: 'healthy',
        ttsWorking: testResult.success,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('TTS health check failed:', error)
    res.status(500).json({
      error: 'TTS service unhealthy'
    })
  }
})

export default router