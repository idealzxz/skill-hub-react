import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './store/AppContext'
import App from './App'
import './index.css'

if (typeof globalThis.CustomEvent !== 'function') {
  class CustomEventPolyfill<T = unknown> extends Event implements CustomEvent<T> {
    detail: T

    constructor(event: string, params?: CustomEventInit<T>) {
      super(event, params)
      this.detail = params?.detail as T
    }
  }

  // Make browser-only CustomEvent available in non-browser runtimes.
  ;(globalThis as typeof globalThis & { CustomEvent: typeof CustomEventPolyfill }).CustomEvent = CustomEventPolyfill
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
