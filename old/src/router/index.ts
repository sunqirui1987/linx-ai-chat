import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      meta: {
        requiresAuth: true,
        title: 'AI对话游戏聊天智能体'
      }
    },
    {
      path: '/login',
      name: 'login',
      meta: {
        requiresAuth: false,
        title: '登录 - AI对话游戏聊天智能体'
      }
    },
    {
      path: '/chat/:sessionId?',
      name: 'chat',
      meta: {
        requiresAuth: true,
        title: '聊天 - AI对话游戏聊天智能体'
      }
    },
    {
      path: '/memory',
      name: 'memory',
      meta: {
        requiresAuth: true,
        title: '记忆片段 - AI对话游戏聊天智能体'
      }
    },
    {
      path: '/settings',
      name: 'settings',
      meta: {
        requiresAuth: true,
        title: '设置 - AI对话游戏聊天智能体'
      }
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    // 如果没有token，重定向到登录页
    if (!authStore.token) {
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 验证token有效性
    try {
      if (!authStore.isAuthenticated) {
        const isValid = await authStore.validateToken()
        if (!isValid) {
          authStore.logout()
          next({
            name: 'login',
            query: { redirect: to.fullPath }
          })
          return
        }
      }
    } catch (error) {
      console.error('Token validation failed:', error)
      authStore.logout()
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      })
      return
    }
  }

  // 如果已登录用户访问登录页，重定向到首页
  if (to.name === 'login' && authStore.isAuthenticated) {
    const redirectPath = (to.query.redirect as string) || '/'
    next(redirectPath)
    return
  }

  next()
})

// 路由后置守卫
router.afterEach((to, from) => {
  // 页面切换后的处理
  console.log(`Route changed from ${from.path} to ${to.path}`)
  
  // 可以在这里添加页面访问统计等逻辑
})

export default router