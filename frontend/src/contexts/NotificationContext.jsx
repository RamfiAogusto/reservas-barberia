'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const NotificationContext = createContext(null)

const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgir+8n2FEMS9markup-audio'

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [persistentBanners, setPersistentBanners] = useState([])
  const audioRef = useRef(null)

  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = 0.5
  }, [])

  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
      oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2)

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)

      oscillator.start(audioCtx.currentTime)
      oscillator.stop(audioCtx.currentTime + 0.4)
    } catch (e) {
      // Audio context not available
    }
  }, [])

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random()
    const newNotification = { id, timestamp: new Date(), read: false, ...notification }

    setNotifications(prev => [newNotification, ...prev].slice(0, 50))
    setUnreadCount(prev => prev + 1)

    if (notification.persistent) {
      setPersistentBanners(prev => [newNotification, ...prev])
    }

    if (notification.playSound !== false) {
      playNotificationSound()
    }

    return id
  }, [playNotificationSound])

  const dismissBanner = useCallback((id) => {
    setPersistentBanners(prev => prev.filter(b => b.id !== id))
  }, [])

  const dismissAllBanners = useCallback(() => {
    setPersistentBanners([])
  }, [])

  const markAllRead = useCallback(() => {
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
    setPersistentBanners([])
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      persistentBanners,
      addNotification,
      dismissBanner,
      dismissAllBanners,
      markAllRead,
      clearNotifications,
      playNotificationSound,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    return {
      notifications: [], unreadCount: 0, persistentBanners: [],
      addNotification: () => {}, dismissBanner: () => {}, dismissAllBanners: () => {},
      markAllRead: () => {}, clearNotifications: () => {}, playNotificationSound: () => {},
    }
  }
  return context
}
