#!/usr/bin/env node

/**
 * 测试统一LLM分析流程
 * 验证新的contentAnalysisService和重构后的chatService
 */

import { chatService } from './api/services/chatService.ts'
import { contentAnalysisService } from './api/services/contentAnalysisService.ts'
import { database } from './api/database/database.ts'

async function testUnifiedAnalysis() {
  console.log('🚀 开始测试统一LLM分析流程...\n')

  try {
    // 数据库已在构造函数中自动初始化
    console.log('📊 数据库已就绪...')
    
    // 创建测试会话
    console.log('💬 创建测试会话...')
    const session = await chatService.createSession({
      personality: 'angel',
      title: '统一分析测试会话'
    })
    console.log(`✅ 会话创建成功: ${session.id}`)

    // 测试用例
    const testCases = [
      {
        content: '我今天心情很糟糕，感觉一切都不顺利',
        description: '负面情绪测试'
      },
      {
        content: '我想了解更多关于这个世界的秘密',
        description: '记忆解锁触发测试'
      },
      {
        content: '我觉得应该做一些善良的事情帮助别人',
        description: '天使人格倾向测试'
      },
      {
        content: '有时候我觉得报复那些伤害我的人是对的',
        description: '恶魔人格倾向测试'
      }
    ]

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i]
      console.log(`\n🧪 测试用例 ${i + 1}: ${testCase.description}`)
      console.log(`📝 输入内容: "${testCase.content}"`)

      try {
        // 1. 测试统一内容分析
        console.log('\n🔍 步骤1: 统一内容分析...')
        const analysisResult = await contentAnalysisService.analyzeContent({
          content: testCase.content,
          sessionId: session.id,
          currentPersonality: 'angel',
          conversationHistory: [],
          userId: 1
        })

        console.log('📊 分析结果:')
        console.log(`  情绪: ${analysisResult.emotion.type} (强度: ${analysisResult.emotion.intensity})`)
        console.log(`  人格切换: ${analysisResult.personalityAnalysis.shouldSwitch ? '是' : '否'}`)
        if (analysisResult.personalityAnalysis.shouldSwitch) {
          console.log(`  新人格: ${analysisResult.personalityAnalysis.newPersonality}`)
        }
        console.log(`  记忆解锁候选: [${analysisResult.memoryAnalysis.unlockCandidates.join(', ')}]`)
        console.log(`  好感度类型: ${analysisResult.affinityAnalysis.choiceType}`)

        // 2. 测试完整的对话生成流程
        console.log('\n💬 步骤2: 完整对话生成...')
        const response = await chatService.generateResponse({
          content: testCase.content,
          sessionId: session.id,
          personality: 'angel',
          emotion: { type: 'neutral', intensity: 0.5 },
          enableTTS: false
        })

        console.log('🤖 AI回应:')
        console.log(`  内容: "${response.content.substring(0, 100)}${response.content.length > 100 ? '...' : ''}"`)
        console.log(`  最终人格: ${response.personality}`)
        console.log(`  情绪: ${response.emotion.type}`)
        console.log(`  解锁记忆数量: ${response.memoryUnlocked?.length || 0}`)

        if (response.memoryUnlocked && response.memoryUnlocked.length > 0) {
          console.log('🔓 解锁的记忆片段:')
          response.memoryUnlocked.forEach(memory => {
            console.log(`  - ${memory.title} (${memory.id})`)
          })
        }

      } catch (error) {
        console.error(`❌ 测试用例 ${i + 1} 失败:`, error.message)
        console.error('详细错误:', error)
      }

      // 添加延迟避免过快请求
      if (i < testCases.length - 1) {
        console.log('\n⏳ 等待2秒...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // 获取会话统计
    console.log('\n📈 会话统计信息:')
    const stats = await chatService.getSessionStats(session.id)
    console.log('统计结果:', JSON.stringify(stats, null, 2))

    console.log('\n✅ 统一LLM分析流程测试完成!')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    console.error('错误详情:', error.stack)
  }
}

// 运行测试
testUnifiedAnalysis().catch(console.error)