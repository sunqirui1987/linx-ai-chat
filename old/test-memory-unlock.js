// 记忆解锁测试脚本
// 用于验证修复后的记忆解锁功能

import { memoryService } from './api/services/memoryService.ts';

async function testMemoryUnlock() {
  console.log('🧪 开始测试记忆解锁功能...\n');

  // 模拟测试数据
  const testSessionId = 'test-session-' + Date.now();
  const testContent = '你好，我想和你聊天';
  const testEmotion = {
    positive: 0.8,
    negative: 0.1,
    neutral: 0.1
  };

  try {
    console.log('📊 测试会话统计数据获取...');
    const stats = await memoryService.getSessionStats(testSessionId);
    console.log('会话统计:', JSON.stringify(stats, null, 2));

    console.log('\n🔍 测试记忆解锁检查...');
    const unlockResult = await memoryService.checkMemoryUnlock(
      testContent,
      testEmotion,
      testSessionId
    );
    
    console.log('解锁结果:', JSON.stringify(unlockResult, null, 2));

    console.log('\n📋 获取所有记忆片段...');
    const allFragments = await memoryService.getAllMemoryFragments();
    console.log(`总共有 ${allFragments.length} 个记忆片段`);

    // 显示前几个记忆片段的解锁条件
    console.log('\n🎯 记忆片段解锁条件示例:');
    allFragments.slice(0, 5).forEach(fragment => {
      console.log(`\n${fragment.id} - ${fragment.title}:`);
      try {
        const conditions = JSON.parse(fragment.unlock_conditions || '{}');
        console.log('  解锁条件:', JSON.stringify(conditions, null, 4));
      } catch (error) {
        console.log('  解锁条件解析错误:', error.message);
      }
    });

    console.log('\n✅ 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testMemoryUnlock().catch(console.error);

export { testMemoryUnlock };