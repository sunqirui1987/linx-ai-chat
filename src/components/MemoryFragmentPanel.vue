<template>
  <div class="memory-fragment-panel">
    <div class="panel-header">
      <h3 class="panel-title">记忆片段</h3>
      <div class="panel-stats">
        <span class="stat-item">
          已解锁: {{ unlockedCount }}/{{ totalCount }}
        </span>
        <span class="stat-item">
          完成度: {{ completionPercentage }}%
        </span>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filter-section">
      <div class="filter-group">
        <label>类别:</label>
        <select v-model="selectedCategory" @change="filterFragments">
          <option value="">全部</option>
          <option v-for="(info, key) in categoryInfo" :key="key" :value="key">
            {{ info.name }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label>稀有度:</label>
        <select v-model="selectedRarity" @change="filterFragments">
          <option value="">全部</option>
          <option v-for="(info, key) in rarityInfo" :key="key" :value="key">
            {{ info.name }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>状态:</label>
        <select v-model="selectedStatus" @change="filterFragments">
          <option value="">全部</option>
          <option value="unlocked">已解锁</option>
          <option value="locked">未解锁</option>
        </select>
      </div>
    </div>

    <!-- 记忆片段列表 -->
    <div class="fragments-container" v-if="!isLoading">
      <div 
        v-for="fragment in filteredFragments" 
        :key="fragment.id"
        class="fragment-card"
        :class="{ 
          'unlocked': fragment.isUnlocked,
          'locked': !fragment.isUnlocked,
          [`rarity-${fragment.rarity}`]: true
        }"
        @click="selectFragment(fragment)"
      >
        <div class="fragment-header">
          <div class="fragment-title">
            <span class="fragment-name">{{ fragment.name }}</span>
            <span class="fragment-category">{{ getCategoryName(fragment.category) }}</span>
          </div>
          <div class="fragment-rarity" :class="`rarity-${fragment.rarity}`">
            {{ getRarityName(fragment.rarity) }}
          </div>
        </div>
        
        <div class="fragment-description">
          {{ fragment.isUnlocked ? fragment.description : '???' }}
        </div>

        <div class="fragment-footer">
          <div class="unlock-status">
            <span v-if="fragment.isUnlocked" class="status-unlocked">
              ✓ 已解锁
            </span>
            <span v-else class="status-locked">
              🔒 未解锁
            </span>
          </div>
          
          <div v-if="fragment.isUnlocked && fragment.unlockedAt" class="unlock-time">
            {{ formatDate(fragment.unlockedAt) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载记忆片段中...</p>
    </div>

    <!-- 空状态 -->
    <div v-if="!isLoading && filteredFragments.length === 0" class="empty-state">
      <p>没有找到符合条件的记忆片段</p>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="selectedFragment" class="fragment-modal" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h4>{{ selectedFragment.name }}</h4>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="fragment-details">
            <div class="detail-row">
              <span class="label">类别:</span>
              <span class="value">{{ getCategoryName(selectedFragment.category) }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">稀有度:</span>
              <span class="value rarity" :class="`rarity-${selectedFragment.rarity}`">
                {{ getRarityName(selectedFragment.rarity) }}
              </span>
            </div>
            
            <div class="detail-row">
              <span class="label">状态:</span>
              <span class="value" :class="selectedFragment.isUnlocked ? 'unlocked' : 'locked'">
                {{ selectedFragment.isUnlocked ? '已解锁' : '未解锁' }}
              </span>
            </div>
            
            <div v-if="selectedFragment.isUnlocked && selectedFragment.unlockedAt" class="detail-row">
              <span class="label">解锁时间:</span>
              <span class="value">{{ formatDate(selectedFragment.unlockedAt) }}</span>
            </div>
          </div>
          
          <div class="fragment-content">
            <h5>描述</h5>
            <p>{{ selectedFragment.isUnlocked ? selectedFragment.description : '此记忆片段尚未解锁' }}</p>
            
            <div v-if="!selectedFragment.isUnlocked" class="unlock-conditions">
              <h5>解锁条件</h5>
              <div class="condition-list">
                <div v-if="selectedFragment.unlock_conditions.angel_choices" class="condition-item">
                  天使选择次数: {{ selectedFragment.unlock_conditions.angel_choices }}
                </div>
                <div v-if="selectedFragment.unlock_conditions.demon_choices" class="condition-item">
                  恶魔选择次数: {{ selectedFragment.unlock_conditions.demon_choices }}
                </div>
                <div v-if="selectedFragment.unlock_conditions.total_conversations" class="condition-item">
                  总对话次数: {{ selectedFragment.unlock_conditions.total_conversations }}
                </div>
                <div v-if="selectedFragment.unlock_conditions.affinity_threshold" class="condition-item">
                  好感度阈值: {{ selectedFragment.unlock_conditions.affinity_threshold }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMemoryFragmentStore } from '@/stores/memoryFragment'

const memoryStore = useMemoryFragmentStore()

// 响应式数据
const selectedCategory = ref('')
const selectedRarity = ref('')
const selectedStatus = ref('')
const selectedFragment = ref(null)
const isLoading = ref(false)

// 计算属性
const filteredFragments = computed(() => {
  let fragments = memoryStore.fragments
  
  if (selectedCategory.value) {
    fragments = fragments.filter(f => f.category === selectedCategory.value)
  }
  
  if (selectedRarity.value) {
    fragments = fragments.filter(f => f.rarity === selectedRarity.value)
  }
  
  if (selectedStatus.value) {
    if (selectedStatus.value === 'unlocked') {
      fragments = fragments.filter(f => f.isUnlocked)
    } else if (selectedStatus.value === 'locked') {
      fragments = fragments.filter(f => !f.isUnlocked)
    }
  }
  
  return fragments
})

const unlockedCount = computed(() => 
  memoryStore.fragments.filter(f => f.isUnlocked).length
)

const totalCount = computed(() => memoryStore.fragments.length)

const completionPercentage = computed(() => 
  totalCount.value > 0 ? Math.round((unlockedCount.value / totalCount.value) * 100) : 0
)

const categoryInfo = computed(() => memoryStore.categoryInfo)
const rarityInfo = computed(() => memoryStore.rarityInfo)

// 方法
const filterFragments = () => {
  // 筛选逻辑已在计算属性中处理
}

const selectFragment = (fragment) => {
  selectedFragment.value = fragment
}

const closeModal = () => {
  selectedFragment.value = null
}

const getCategoryName = (category: string) => {
  return categoryInfo.value[category]?.name || category
}

const getRarityName = (rarity: string) => {
  return rarityInfo.value[rarity]?.name || rarity
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(async () => {
  isLoading.value = true
  try {
    await memoryStore.fetchFragments()
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.memory-fragment-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  color: #fff;
  font-size: 1.2em;
  font-weight: 600;
  margin: 0;
}

.panel-stats {
  display: flex;
  gap: 15px;
}

.stat-item {
  color: #b0b0b0;
  font-size: 0.9em;
}

.filter-section {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  color: #ccc;
  font-size: 0.9em;
  white-space: nowrap;
}

.filter-group select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  padding: 6px 10px;
  font-size: 0.9em;
}

.fragments-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  max-height: 500px;
  overflow-y: auto;
}

.fragment-card {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.fragment-card:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.fragment-card.locked {
  opacity: 0.6;
  border-color: rgba(255, 255, 255, 0.05);
}

.fragment-card.unlocked {
  border-color: rgba(76, 175, 80, 0.3);
}

.fragment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.fragment-title {
  flex: 1;
}

.fragment-name {
  display: block;
  color: #fff;
  font-weight: 600;
  font-size: 1em;
  margin-bottom: 4px;
}

.fragment-category {
  color: #b0b0b0;
  font-size: 0.8em;
}

.fragment-rarity {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
}

.rarity-common { background: rgba(158, 158, 158, 0.3); color: #9e9e9e; }
.rarity-rare { background: rgba(33, 150, 243, 0.3); color: #2196f3; }
.rarity-epic { background: rgba(156, 39, 176, 0.3); color: #9c27b0; }
.rarity-legendary { background: rgba(255, 152, 0, 0.3); color: #ff9800; }
.rarity-mythic { background: rgba(244, 67, 54, 0.3); color: #f44336; }

.fragment-description {
  color: #ccc;
  font-size: 0.9em;
  line-height: 1.4;
  margin-bottom: 12px;
  min-height: 40px;
}

.fragment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-unlocked {
  color: #4caf50;
  font-size: 0.8em;
}

.status-locked {
  color: #ff9800;
  font-size: 0.8em;
}

.unlock-time {
  color: #888;
  font-size: 0.7em;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px;
  color: #888;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fragment-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(30, 30, 30, 0.95);
  border-radius: 12px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h4 {
  color: #fff;
  margin: 0;
  font-size: 1.2em;
}

.close-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 20px;
}

.fragment-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.detail-row .label {
  color: #888;
  font-weight: 500;
}

.detail-row .value {
  color: #fff;
}

.detail-row .value.unlocked {
  color: #4caf50;
}

.detail-row .value.locked {
  color: #ff9800;
}

.fragment-content h5 {
  color: #fff;
  margin: 15px 0 10px 0;
  font-size: 1em;
}

.fragment-content p {
  color: #ccc;
  line-height: 1.5;
  margin-bottom: 15px;
}

.unlock-conditions {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
}

.condition-list {
  margin-top: 10px;
}

.condition-item {
  color: #ccc;
  font-size: 0.9em;
  margin-bottom: 5px;
  padding-left: 15px;
  position: relative;
}

.condition-item::before {
  content: '•';
  color: #888;
  position: absolute;
  left: 0;
}
</style>