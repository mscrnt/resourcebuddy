import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003'

const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: {
        // Default settings
        appTitle: 'ResourceBuddy',
        logoUrl: '/logo.png',
        logoDarkUrl: '/logo-dark.png',
        logoLightUrl: '/logo-light.png',
        faviconUrl: '/favicon-rb.png',
        primaryColor: '#10b981',
      },
      isLoading: false,
      error: null,
      
      // Fetch settings from backend
      fetchSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await axios.get(`${BACKEND_URL}/api/settings`)
          set({ settings: response.data, isLoading: false })
        } catch (error) {
          console.error('Failed to fetch settings:', error)
          set({ error: error.message, isLoading: false })
        }
      },
      
      // Update settings
      updateSettings: async (newSettings) => {
        set({ isLoading: true, error: null })
        try {
          const response = await axios.put(`${BACKEND_URL}/api/settings`, newSettings)
          if (response.data.success) {
            set({ settings: response.data.settings, isLoading: false })
            return true
          }
          throw new Error(response.data.error || 'Failed to update settings')
        } catch (error) {
          console.error('Failed to update settings:', error)
          set({ error: error.message, isLoading: false })
          return false
        }
      },
      
      // Get specific setting
      getSetting: (key) => {
        const state = get()
        return state.settings[key]
      },
      
      // Helper function to convert hex to RGB
      hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result
          ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
          : '16 185 129' // Default green
      },
      
      // Apply theme colors to CSS variables
      applyTheme: () => {
        const { settings } = get()
        const root = document.documentElement
        
        // Apply theme colors
        root.style.setProperty('--color-primary', settings.primaryColor || '#10b981')
        root.style.setProperty('--color-primary-dark', settings.primaryColorDark || '#059669')
        root.style.setProperty('--color-accent', settings.accentColor || '#10b981')
        
        // Set RGB values for colors that need opacity
        const accentRgb = get().hexToRgb(settings.accentColor || '#10b981')
        root.style.setProperty('--color-accent-rgb', accentRgb)
        
        // Apply dark theme colors
        root.style.setProperty('--color-dark-bg', settings.darkBackground || '#0a0a0a')
        root.style.setProperty('--color-dark-bg-secondary', settings.darkBackgroundSecondary || '#171717')
        root.style.setProperty('--color-dark-bg-tertiary', settings.darkBackgroundTertiary || '#262626')
        root.style.setProperty('--color-dark-text', settings.darkText || '#ffffff')
        root.style.setProperty('--color-dark-text-secondary', settings.darkTextSecondary || '#a3a3a3')
        root.style.setProperty('--color-dark-border', settings.darkBorder || '#404040')
        
        // Update document title
        document.title = settings.appTitle || 'ResourceBuddy'
        
        // Apply custom CSS if provided
        if (settings.customCss) {
          let styleElement = document.getElementById('custom-settings-styles')
          if (!styleElement) {
            styleElement = document.createElement('style')
            styleElement.id = 'custom-settings-styles'
            document.head.appendChild(styleElement)
          }
          styleElement.textContent = settings.customCss
        }
      }
    }),
    {
      name: 'rs-settings-storage',
      partialize: (state) => ({ settings: state.settings })
    }
  )
)

export default useSettingsStore