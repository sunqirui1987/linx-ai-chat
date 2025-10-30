import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// 创建应用实例
const app = createApp(App)

// 创建 Pinia 实例
const pinia = createPinia()

// 使用插件
app.use(pinia)
app.use(router)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  console.error('Component instance:', instance)
  console.error('Error info:', info)
  
  // 可以在这里添加错误上报逻辑
}

// 全局警告处理
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Global warning:', msg)
  console.warn('Component instance:', instance)
  console.warn('Component trace:', trace)
}

// 全局属性
app.config.globalProperties.$log = console.log

// 挂载应用
app.mount('#app')

// 开发环境下的调试工具
if (import.meta.env.DEV) {
  // 暴露应用实例到全局，方便调试
  ;(window as any).__VUE_APP__ = app
  
  // 性能监控
  if (import.meta.env.VITE_PERFORMANCE_MONITORING === 'true') {
    // 监控组件渲染性能
    app.config.performance = true
  }
}

// 注册 Service Worker（生产环境）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

// 处理未捕获的 Promise 错误
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // 可以在这里添加错误上报逻辑
})

// 处理未捕获的错误
window.addEventListener('error', (event) => {
  console.error('Unhandled error:', event.error)
  // 可以在这里添加错误上报逻辑
})

export default app