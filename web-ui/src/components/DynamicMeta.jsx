import { useEffect } from 'react'
import useSettingsStore from '../stores/useSettingsStore'

export default function DynamicMeta() {
  const { settings } = useSettingsStore()
  
  useEffect(() => {
    // Update document title
    if (settings.appTitle) {
      document.title = settings.appTitle
    }
    
    // Update favicon
    if (settings.faviconUrl) {
      const link = document.querySelector("link[rel~='icon']") || document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'icon'
      link.href = settings.faviconUrl
      document.getElementsByTagName('head')[0].appendChild(link)
    }
  }, [settings.appTitle, settings.faviconUrl])
  
  return null
}