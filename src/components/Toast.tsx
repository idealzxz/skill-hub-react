import { CheckCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../store/AppContext'

export default function Toast() {
  const { state } = useApp()

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {state.toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className="px-5 py-3 rounded-2xl border border-white/40 dark:border-white/15 bg-white/85 dark:bg-[#1e1e32]/95 backdrop-blur-xl text-[#332B25] dark:!text-white text-sm font-medium shadow-2xl dark:shadow-black/40 flex items-center gap-2 pointer-events-auto"
          >
            <CheckCircle className="w-4 h-4 text-accent" />
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
