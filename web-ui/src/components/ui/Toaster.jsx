import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

let toastCount = 0
const toasts = new Map()
const listeners = new Set()

export function toast({ title, description, variant = 'default', duration = 5000 }) {
  const id = toastCount++
  const toast = { id, title, description, variant }
  
  toasts.set(id, toast)
  listeners.forEach(listener => listener())
  
  if (duration > 0) {
    setTimeout(() => {
      toasts.delete(id)
      listeners.forEach(listener => listener())
    }, duration)
  }
  
  return id
}

export function Toaster() {
  const [, forceUpdate] = useState({})
  
  useEffect(() => {
    const listener = () => forceUpdate({})
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, [])
  
  const activeToasts = Array.from(toasts.values())
  
  const dismissToast = (id) => {
    toasts.delete(id)
    forceUpdate({})
  }
  
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'relative overflow-hidden rounded-lg px-6 py-4 shadow-lg',
            'animate-slide-up transform transition-all duration-300',
            'min-w-[300px] max-w-md',
            {
              'bg-art-gray-800 text-white': toast.variant === 'default',
              'bg-red-900 text-white': toast.variant === 'error',
              'bg-green-900 text-white': toast.variant === 'success',
            }
          )}
        >
          <button
            onClick={() => dismissToast(toast.id)}
            className="absolute right-2 top-2 rounded-md p-1 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          {toast.title && (
            <div className="font-semibold mb-1">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  )
}