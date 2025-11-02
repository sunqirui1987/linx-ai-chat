import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

// 测试用户数据
const testUser = {
  username: 'test_memory_user',
  password: 'test123'
};

let authToken = '';
let sessionId = '';

async function login() {
  try {
    console.log('🔐 登录测试用户...');
    const response = await axios.post(`${API_BASE}/auth/login`, testUser);
    authToken = response.data.token;
    console.log('✅ 登录成功');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('👤 用户不存在，尝试注册...');
      try {
        await axios.post(`${API_BASE}/auth/register`, testUser);
        console.log('✅ 注册成功');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
        authToken = loginResponse.data.token;
        console.log('✅ 登录成功');
        return true;
      } catch (regError) {
        console.error('❌ 注册失败:', regError.response?.data || regError.message);
        return false;
      }
    } else {
      console.error('❌ 登录失败:', error.response?.data || error.message);
      return false;
    }
  }
}

async function createSession() {
  try {
    console.log('📝 创建新会话...');
    const response = await axios.post(
      `${API_BASE}/chat/sessions`,
      { title: '记忆测试会话' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    sessionId = response.data.session.id;
    console.log(`✅ 会话创建成功，ID: ${sessionId}`);
    return true;
  } catch (error) {
    console.error('❌ 创建会话失败:', error.response?.data || error.message);
    return false;
  }
}

async function sendTestMessage(message, expectedMemoryTrigger = false) {
  try {
    console.log(`💬 发送消息: "${message}"`);
    const response = await axios.post(
      `${API_BASE}/chat/message`,
      {
        message: message,
        session_id: sessionId,
        personality: 'default'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const result = response.data;
    console.log(`🤖 AI回复: ${result.message.substring(0, 100)}...`);
    
    if (result.memory_unlocked) {
      console.log(`🔓 解锁记忆片段: ${result.memory_unlocked.title}`);
      console.log(`📖 内容: ${result.memory_unlocked.content}`);
      return true;
    } else if (expectedMemoryTrigger) {
      console.log('⚠️  预期会解锁记忆片段，但没有解锁');
      return false;
    } else {
      console.log('📝 没有解锁新的记忆片段');
      return true;
    }
  } catch (error) {
    console.error('❌ 发送消息失败:', error.response?.data || error.message);
    return false;
  }
}

async function getMemoryProgress() {
  try {
    console.log('📊 获取记忆进度...');
    const response = await axios.get(
      `${API_BASE}/memory/progress`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const progress = response.data;
    console.log(`📈 记忆解锁进度: ${progress.unlocked_count}/${progress.total_fragments} (${progress.unlock_progress.toFixed(1)}%)`);
    
    if (progress.recent_unlocks.length > 0) {
      console.log('🆕 最近解锁的记忆:');
      progress.recent_unlocks.forEach(memory => {
        console.log(`  - ${memory.title}: ${memory.description}`);
      });
    }
    
    return progress;
  } catch (error) {
    console.error('❌ 获取记忆进度失败:', error.response?.data || error.message);
    return null;
  }
}

async function testContentAnalysis() {
  try {
    console.log('🔍 测试内容分析服务...');
    
    // 直接测试内容分析API（如果有的话）
    const testMessages = [
      '我感到很孤独，没有人理解我',
      '今天心情很好，想要做一些有意义的事情',
      '我在思考生命的意义，什么是真正重要的？',
      '有时候我觉得自己很邪恶，想要做坏事',
      '我想要帮助别人，成为一个更好的人'
    ];
    
    for (const message of testMessages) {
      await sendTestMessage(message);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    }
    
    return true;
  } catch (error) {
    console.error('❌ 内容分析测试失败:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 开始测试记忆片段更新功能...\n');
  
  // 1. 登录
  if (!(await login())) {
    return;
  }
  
  // 2. 创建会话
  if (!(await createSession())) {
    return;
  }
  
  // 3. 获取初始记忆进度
  console.log('\n📊 初始状态:');
  const initialProgress = await getMemoryProgress();
  
  // 4. 测试内容分析和记忆解锁
  console.log('\n🧪 开始内容分析测试:');
  await testContentAnalysis();
  
  // 5. 获取最终记忆进度
  console.log('\n📊 最终状态:');
  const finalProgress = await getMemoryProgress();
  
  // 6. 比较结果
  if (initialProgress && finalProgress) {
    const unlockedCount = finalProgress.unlocked_count - initialProgress.unlocked_count;
    console.log(`\n🎯 测试结果: 新解锁了 ${unlockedCount} 个记忆片段`);
    
    if (unlockedCount > 0) {
      console.log('✅ 记忆片段更新功能正常工作！');
    } else {
      console.log('⚠️  没有解锁新的记忆片段，可能需要更多触发条件');
    }
  }
  
  console.log('\n🏁 测试完成');
}

// 运行测试
runTests().catch(console.error);