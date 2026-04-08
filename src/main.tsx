import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './store/AppContext'
import App from './App'
import './index.css'

if (typeof globalThis.CustomEvent !== 'function') {
  // 极简 polyfill，仅用于无 CustomEvent 的环境；类型用断言对齐全局构造函数
  const CustomEventPolyfill = class extends Event {
    detail: unknown
    constructor(type: string, params?: CustomEventInit) {
      super(type, params)
      this.detail = params?.detail
    }
  }
  globalThis.CustomEvent = CustomEventPolyfill as unknown as typeof CustomEvent
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
