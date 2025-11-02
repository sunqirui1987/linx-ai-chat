import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '../utils/api'

interface User {
  id: number
  username: string
  created_at: string
  updated_at?: string
}

interface LoginCredentials {
  username: string
  password: string
}

interface RegisterCredentials {
  username: string
  password: string
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const isLoading = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // 方法
  const login = async (credentials: LoginCredentials) => {
    try {
      isLoading.value = true
      console.log('🔍 Frontend login credentials:', credentials)
      console.log('🔍 Credentials type:', typeof credentials)
      console.log('🔍 Credentials JSON:', JSON.stringify(credentials))
      const response = await apiClient.post('/auth/login', credentials)
      
      if (response.data.success) {
        token.value = response.data.data.token
        user.value = response.data.data.user
        
        // 保存到本地存储
        localStorage.setItem('auth_token', token.value)
        
        // 设置API客户端的默认token
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
        
        return response.data
      } else {
        throw new Error(response.data.message || '登录失败')
      }
    } catch (error: any) {
      console.error('登录失败:', error)
      throw new Error(error.response?.data?.message || error.message || '登录失败')
    } finally {
      isLoading.value = false
    }
  }

  const register = async (credentials: RegisterCredentials) => {
    try {
      isLoading.value = true
      const response = await apiClient.post('/auth/register', credentials)
      
      if (response.data.success) {
        token.value = response.data.data.token
        user.value = response.data.data.user
        
        // 保存到本地存储
        localStorage.setItem('auth_token', token.value)
        
        // 设置API客户端的默认token
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
        
        return response.data
      } else {
        throw new Error(response.data.message || '注册失败')
      }
    } catch (error: any) {
      console.error('注册失败:', error)
      throw new Error(error.response?.data?.message || '注册失败')
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // 调用后端登出接口
      if (token.value) {
        await apiClient.post('/auth/logout')
      }
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      // 清除本地状态
      user.value = null
      token.value = null
      localStorage.removeItem('auth_token')
      
      // 清除API客户端的token
      delete apiClient.defaults.headers.common['Authorization']
    }
  }

  const validateToken = async () => {
    if (!token.value) {
      throw new Error('没有token')
    }

    try {
      // 设置API客户端的token
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      
      const response = await apiClient.get('/auth/me')
      
      if (response.data.success) {
        user.value = response.data.data
        return response.data
      } else {
        throw new Error('Token验证失败')
      }
    } catch (error: any) {
      console.error('Token验证失败:', error)
      // Token无效，清除登录状态
      await logout()
      throw error
    }
  }

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      isLoading.value = true
      const response = await apiClient.put('/auth/profile', profileData)
      
      if (response.data.success) {
        user.value = { ...user.value, ...response.data.data.user }
        return response.data
      } else {
        throw new Error(response.data.message || '更新资料失败')
      }
    } catch (error: any) {
      console.error('更新资料失败:', error)
      throw new Error(error.response?.data?.message || '更新资料失败')
    } finally {
      isLoading.value = false
    }
  }

  // 初始化时设置token并验证
  if (token.value) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    // 自动验证token并获取用户信息
    validateToken().catch(() => {
      // 如果验证失败，清除无效的token
      logout()
    })
  }

  return {
    // 状态
    user,
    token,
    isLoading,
    
    // 计算属性
    isAuthenticated,
    
    // 方法
    login,
    register,
    logout,
    validateToken,
    updateProfile
  }
})