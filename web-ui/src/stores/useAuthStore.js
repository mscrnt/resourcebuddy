import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      password: null, // Store encrypted or use session storage
      sessionKey: null,
      isAuthenticated: false,
      
      login: (userData, password) => {
        // Store user credentials
        set({
          user: userData,
          password: password, // In production, this should be encrypted
          sessionKey: userData.sessionKey,
          isAuthenticated: true,
        })
      },
      
      logout: () => {
        // Clear all auth data
        set({
          user: null,
          password: null,
          sessionKey: null,
          isAuthenticated: false,
        })
        // Clear any other stored data
        localStorage.removeItem('rs-auth-storage')
        sessionStorage.clear()
      },
      
      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData },
      })),
      
      // Get current credentials for API calls
      getCredentials: () => {
        const state = get()
        return {
          username: state.user?.username,
          password: state.password,
          sessionKey: state.sessionKey,
        }
      },
    }),
    {
      name: 'rs-auth-storage', // unique name for localStorage
      partialize: (state) => ({ 
        // Only persist certain fields
        user: state.user,
        sessionKey: state.sessionKey,
        isAuthenticated: state.isAuthenticated,
        // Don't persist password in localStorage for security
      }),
      onRehydrateStorage: () => (state) => {
        // When rehydrating from storage, check if session is still valid
        if (state && state.isAuthenticated && !state.password) {
          // If we don't have the password (e.g., after page reload), 
          // we'll need to re-authenticate
          console.log('Session restored but password missing - may need to re-login')
        }
      },
    }
  )
)

export default useAuthStore