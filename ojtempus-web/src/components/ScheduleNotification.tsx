import { useEffect, useState, useCallback } from 'react'
import { type WorkSchedule } from '../lib/supabase'
import { XIcon } from './Icons'

type Theme = 'light' | 'dark' | 'pinktasha'

interface ScheduleNotificationProps {
  schedules: WorkSchedule[]
  theme: Theme
}

interface Notification {
  id: string
  scheduleId: string
  title: string
  message: string
  type: 'upcoming' | 'now' | 'overdue'
  timeUntil: number // minutes
}

export function useScheduleNotifications(schedules: WorkSchedule[]) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  
  const checkNotifications = useCallback(() => {
    const now = new Date()
    const newNotifications: Notification[] = []
    
    schedules.forEach(schedule => {
      if (schedule.status === 'cancelled' || schedule.status === 'completed') return
      if (dismissedIds.has(schedule.id)) return
      
      const scheduleDate = new Date(schedule.scheduled_date)
      const [hours, minutes] = (schedule.start_time || '09:00').split(':').map(Number)
      scheduleDate.setHours(hours, minutes, 0, 0)
      
      const diffMs = scheduleDate.getTime() - now.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)
      
      // Show notification if within 15 minutes before start or overdue
      if (diffMinutes > 0 && diffMinutes <= 15) {
        newNotifications.push({
          id: `upcoming-${schedule.id}`,
          scheduleId: schedule.id,
          title: schedule.title,
          message: diffMinutes <= 5 
            ? `Starting in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}!`
            : `Starting soon (${diffMinutes} minutes)`,
          type: diffMinutes <= 5 ? 'now' : 'upcoming',
          timeUntil: diffMinutes
        })
      } else if (diffMinutes <= 0 && diffMinutes > -60) {
        // Overdue but within the hour
        newNotifications.push({
          id: `overdue-${schedule.id}`,
          scheduleId: schedule.id,
          title: schedule.title,
          message: `Started ${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) === 1 ? '' : 's'} ago`,
          type: 'overdue',
          timeUntil: diffMinutes
        })
      }
    })
    
    setNotifications(newNotifications)
    
    // Request browser notification permission and show native notification
    if (newNotifications.length > 0 && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        newNotifications.forEach(notif => {
          if (notif.type === 'now' || notif.type === 'overdue') {
            new Notification('OJTempus - Schedule Alert', {
              body: `${notif.title}: ${notif.message}`,
              icon: '/favicon.svg',
              badge: '/favicon.svg',
              tag: notif.scheduleId,
              requireInteraction: notif.type === 'overdue'
            })
          }
        })
      } else if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [schedules, dismissedIds])
  
  useEffect(() => {
    checkNotifications()
    const interval = setInterval(checkNotifications, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [checkNotifications])
  
  const dismissNotification = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id))
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  const dismissAll = () => {
    const allIds = notifications.map(n => n.scheduleId)
    setDismissedIds(prev => {
      const newSet = new Set(prev)
      allIds.forEach(id => newSet.add(id))
      return newSet
    })
    setNotifications([])
  }
  
  return { notifications, dismissNotification, dismissAll, requestPermission }
}

function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function ScheduleNotificationPanel({ schedules, theme }: ScheduleNotificationProps) {
  const { notifications, dismissNotification, dismissAll } = useScheduleNotifications(schedules)
  
  if (notifications.length === 0) return null
  
  return (
    <div className={`fixed top-4 right-4 z-50 w-80 space-y-3`}>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`transform transition-all duration-500 ease-out animate-in slide-in-from-right ${
            notification.type === 'now' 
              ? 'scale-105' 
              : ''
          }`}
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <div 
            className={`rounded-2xl p-4 shadow-lg backdrop-blur-sm border-l-4 ${
              notification.type === 'now'
                ? theme === 'dark' 
                  ? 'bg-gradient-to-r from-red-900/90 to-red-800/90 border-red-500' 
                  : 'bg-gradient-to-r from-red-50 to-red-100 border-red-500'
                : notification.type === 'overdue'
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-orange-900/90 to-orange-800/90 border-orange-500'
                  : 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-500'
                : theme === 'dark'
                ? 'bg-gradient-to-r from-blue-900/90 to-blue-800/90 border-blue-500'
                : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-500'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                notification.type === 'now'
                  ? 'bg-red-500 text-white animate-pulse'
                  : notification.type === 'overdue'
                  ? 'bg-orange-500 text-white'
                  : theme === 'dark'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}>
                <BellIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {notification.title}
                </p>
                <p className={`text-xs mt-0.5 ${
                  notification.type === 'now'
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : notification.type === 'overdue'
                    ? 'text-orange-600 dark:text-orange-400'
                    : theme === 'dark'
                    ? 'text-blue-300'
                    : 'text-blue-600'
                }`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => dismissNotification(notification.id)}
                className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                    : 'hover:bg-black/5 text-gray-400 hover:text-gray-600'
                }`}
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {notifications.length > 1 && (
        <button
          onClick={dismissAll}
          className={`w-full py-2 px-4 rounded-xl text-xs font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-gray-800/90 text-gray-400 hover:text-white hover:bg-gray-700/90'
              : 'bg-white/90 text-gray-500 hover:text-gray-700 hover:bg-gray-50/90'
          } backdrop-blur-sm shadow-md`}
        >
          Dismiss all notifications
        </button>
      )}
    </div>
  )
}

export function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
