import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useSuccessWithTheme } from '../contexts/SuccessContext'
import { 
  getOJTConfig, 
  getTodayEntry, 
  clockIn, 
  clockOut, 
  getTotalHoursWorked,
  autoClockOut,
  createOrUpdateManualEntry
} from '../lib/supabase'
import {
  HomeIcon,
  ClockIcon,
  UsersIcon,
  FileIcon,
  PlusIcon,
  LogOutIcon,
  SettingsIcon,
  CalendarIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  FolderIcon,
} from '../components/Icons'
import { ScheduleSection } from '../components/ScheduleSection'
import { FriendsSection } from '../components/FriendsSection'
import { FilesSection } from '../components/FilesSection'
import { DashboardSkeleton } from '../components/Skeleton'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'pinktasha'>('light')
  const { showSuccess } = useSuccessWithTheme(theme)
  const [ojtConfig, setOjtConfig] = useState<{
    total_required_hours: number
    work_hours_per_day: number
    work_days_per_week: number
    estimated_weeks: number
    completed_hours: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Time tracking state
  const [todayEntry, setTodayEntry] = useState<{
    id: string
    clock_in: string | null
    clock_out: string | null
    hours_worked: number
    is_auto_clock_out: boolean
    manual_entry: boolean
  } | null>(null)
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [manualHours, setManualHours] = useState('')
  const [manualEntryDate, setManualEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [timeError, setTimeError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [elapsedTime, setElapsedTime] = useState('00:00:00')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Update elapsed time when on shift
  useEffect(() => {
    const updateElapsedTime = () => {
      if (todayEntry?.clock_in && !todayEntry?.clock_out) {
        const clockInTime = new Date(todayEntry.clock_in).getTime()
        const now = new Date().getTime()
        const diff = now - clockInTime

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)

        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      } else {
        setElapsedTime('00:00:00')
      }
    }

    updateElapsedTime()
    const interval = setInterval(updateElapsedTime, 1000)
    return () => clearInterval(interval)
  }, [todayEntry])

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await getOJTConfig()
      const totalHours = await getTotalHoursWorked()
      if (config) {
        setOjtConfig({
          ...config,
          completed_hours: totalHours
        })
      }
      setIsLoading(false)
    }
    fetchConfig()
  }, [])
  
  // Fetch today's entry and check for auto clock-out
  useEffect(() => {
    const fetchTodayEntry = async () => {
      if (!ojtConfig) return
      
      // Check for auto clock-out first
      await autoClockOut(ojtConfig.work_hours_per_day)
      
      // Then fetch the entry
      const entry = await getTodayEntry()
      setTodayEntry(entry)
    }
    fetchTodayEntry()
    
    // Check every minute for auto clock-out
    const interval = setInterval(fetchTodayEntry, 60000)
    return () => clearInterval(interval)
  }, [ojtConfig])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // Time tracking handlers
  const handleClockIn = async () => {
    setIsProcessing(true)
    setTimeError('')
    try {
      await clockIn()
      const entry = await getTodayEntry()
      setTodayEntry(entry)
      showSuccess('Clocked In!', `You started work at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clock in'
      setTimeError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClockOut = async () => {
    setIsProcessing(true)
    setTimeError('')
    try {
      await clockOut()
      const entry = await getTodayEntry()
      setTodayEntry(entry)
      // Refresh total hours
      const totalHours = await getTotalHoursWorked()
      if (ojtConfig) {
        setOjtConfig({ ...ojtConfig, completed_hours: totalHours })
      }
      showSuccess('Clocked Out!', `You worked ${entry?.hours_worked || 0} hours today. Great job!`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clock out'
      setTimeError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualHoursSubmit = async () => {
    if (!manualHours) return

    const hours = parseFloat(manualHours)
    if (isNaN(hours) || hours <= 0) {
      setTimeError('Please enter valid hours greater than 0')
      return
    }

    // In non-bulk mode, limit to 24 hours per day
    if (!isBulkMode && hours > 24) {
      setTimeError('Please enter valid hours (0.5 - 24) for single day entry')
      return
    }

    // Check if adding these hours would exceed the total required hours
    const requiredHours = ojtConfig?.total_required_hours ?? 500
    const completedHours = ojtConfig?.completed_hours ?? 0
    const projectedTotal = completedHours + hours

    if (projectedTotal > requiredHours) {
      const remaining = requiredHours - completedHours
      setTimeError(`Cannot exceed total required hours. You can only add up to ${remaining.toFixed(2)} more hours.`)
      return
    }

    setIsProcessing(true)
    setTimeError('')
    try {
      if (isBulkMode) {
        // In bulk mode, create an entry without a specific date (using a special identifier)
        await createOrUpdateManualEntry(new Date().toISOString().split('T')[0], hours, 'Bulk hours entry - already rendered')
      } else {
        // Use the new function to create/update entry for the selected date
        await createOrUpdateManualEntry(manualEntryDate, hours, 'Manual entry')
      }

      // Refresh today's entry if it's today
      const today = new Date().toISOString().split('T')[0]
      if (manualEntryDate === today) {
        const entry = await getTodayEntry()
        setTodayEntry(entry)
      }

      // Refresh total hours and update dashboard
      const totalHours = await getTotalHoursWorked()
      if (ojtConfig) {
        setOjtConfig({ ...ojtConfig, completed_hours: totalHours })
      }

      setIsEditMode(false)
      setManualHours('')
      setManualEntryDate(new Date().toISOString().split('T')[0])
      showSuccess('Hours Added!', `Successfully added ${hours} hours to your record.`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update hours'
      setTimeError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Time progress calculations from real config
  const requiredHours = ojtConfig?.total_required_hours ?? 500
  const completedHours = ojtConfig?.completed_hours ?? 0
  const remainingHours = Math.max(0, requiredHours - completedHours)
  const progressPercentage = requiredHours > 0 ? (completedHours / requiredHours) * 100 : 0

  // Daily motivational quotes (Monday - Sunday)
  const dailyQuotes = [
    { day: 'Monday', quote: 'New week, new goals. Start strong!', icon: 'rocket' },
    { day: 'Tuesday', quote: 'Keep the momentum going. You got this!', icon: 'zap' },
    { day: 'Wednesday', quote: 'Halfway through! Stay focused.', icon: 'target' },
    { day: 'Thursday', quote: 'Almost there. Finish the week strong!', icon: 'flame' },
    { day: 'Friday', quote: 'Friday hustle! End the week on a high note.', icon: 'lightning' },
    { day: 'Saturday', quote: 'Rest, recharge, and reflect on your progress.', icon: 'coffee' },
    { day: 'Sunday', quote: 'Prepare for the week ahead. You are capable!', icon: 'star' },
  ]
  const todayQuote = dailyQuotes[currentTime.getDay() === 0 ? 6 : currentTime.getDay() - 1]

  // Icon renderer for daily quotes
  const renderQuoteIcon = (iconName: string) => {
    const iconClass = `w-4 h-4 ${theme === 'pinktasha' ? 'text-[#F13E93]' : 'text-[#43A6FF]'}`
    switch (iconName) {
      case 'rocket':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        )
      case 'zap':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        )
      case 'target':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        )
      case 'flame':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        )
      case 'lightning':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        )
      case 'coffee':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        )
      case 'star':
        return (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        )
      default:
        return null
    }
  }

  // Calculate estimated completion based on work schedule
  const workHoursPerDay = ojtConfig?.work_hours_per_day ?? 8
  const workDaysPerWeek = ojtConfig?.work_days_per_week ?? 5
  const weeklyHours = workHoursPerDay * workDaysPerWeek
  const weeksLeft = weeklyHours > 0 ? Math.ceil(remainingHours / weeklyHours) : 0
  const estimatedDate = new Date()
  estimatedDate.setDate(currentTime.getDate() + (weeksLeft * 7))

  // Formatters
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const formattedEstDate = estimatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Friends data
  const friends = [
    { name: 'Sarah J.', status: 'Working', active: true, color: 'bg-orange-100 text-orange-600' },
    { name: 'Marcus C.', status: 'Offline', active: false, color: 'bg-purple-100 text-purple-600' },
    { name: 'Elena R.', status: 'Working', active: true, color: 'bg-pink-100 text-pink-600' },
  ]

  if (isLoading) {
    return <DashboardSkeleton theme={theme} />
  }

  return (
    <div className={`flex h-screen font-sans antialiased overflow-hidden transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gray-900 text-white selection:bg-[#43A6FF] selection:text-white' 
        : theme === 'pinktasha'
        ? 'bg-[#FFF9E6] text-gray-900 selection:bg-[#F13E93] selection:text-white'
        : 'bg-[#FDFCE9] text-gray-900 selection:bg-[#43A6FF] selection:text-white'
    }`}>
      {/* Sidebar */}
      <nav className={`w-64 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col py-6 z-10 relative transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Logo */}
        <div className="flex items-center px-6 mb-10">
          <h1 className={`text-4xl font-black tracking-tighter drop-shadow-sm transition-colors duration-300 ${
            theme === 'pinktasha' ? 'text-[#F13E93]' : 'text-[#43A6FF]'
          }`}>
            OJTempus
          </h1>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col space-y-2 flex-1 w-full px-4">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-5 py-4 w-full rounded-2xl flex items-center transition-all duration-200 ${
              activeTab === 'home'
                ? theme === 'pinktasha'
                  ? 'bg-[#F13E93] text-white shadow-md shadow-pink-200 translate-y-[-2px]'
                  : 'bg-[#43A6FF] text-white shadow-md shadow-blue-200 translate-y-[-2px]'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <HomeIcon />
            <span className="ml-4 font-bold text-sm tracking-wide">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-5 py-4 w-full rounded-2xl flex items-center transition-all duration-200 ${
              activeTab === 'shifts'
                ? theme === 'pinktasha'
                  ? 'bg-[#F13E93] text-white shadow-md shadow-pink-200 translate-y-[-2px]'
                  : 'bg-[#43A6FF] text-white shadow-md shadow-blue-200 translate-y-[-2px]'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <ClockIcon />
            <span className="ml-4 font-bold text-sm tracking-wide">Schedules</span>
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-5 py-4 w-full rounded-2xl flex items-center transition-all duration-200 ${
              activeTab === 'friends'
                ? theme === 'pinktasha'
                  ? 'bg-[#F13E93] text-white shadow-md shadow-pink-200 translate-y-[-2px]'
                  : 'bg-[#43A6FF] text-white shadow-md shadow-blue-200 translate-y-[-2px]'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <UsersIcon />
            <span className="ml-4 font-bold text-sm tracking-wide">Friends</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-5 py-4 w-full rounded-2xl flex items-center transition-all duration-200 ${
              activeTab === 'files'
                ? theme === 'pinktasha'
                  ? 'bg-[#F13E93] text-white shadow-md shadow-pink-200 translate-y-[-2px]'
                  : 'bg-[#43A6FF] text-white shadow-md shadow-blue-200 translate-y-[-2px]'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <FileIcon />
            <span className="ml-4 font-bold text-sm tracking-wide">Files</span>
          </button>
        </div>

        {/* User Profile / Logout */}
        <div className="mt-auto px-4 w-full">
          <div className={`rounded-2xl p-4 flex items-center justify-between border transition-colors ${
            theme === 'dark' 
              ? 'bg-gray-700 border-gray-600 hover:border-gray-500' 
              : 'bg-gray-50 border-gray-100 hover:border-gray-200'
          }`}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${
                theme === 'pinktasha' ? 'bg-[#F13E93]' : 'bg-[#43A6FF]'
              }`}>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="ml-3 text-left">
                <p className={`text-sm font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className={`text-xs font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>Student Intern</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors p-2"
            >
              <LogOutIcon />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        {activeTab === 'shifts' ? (
          <ScheduleSection theme={theme} />
        ) : activeTab === 'friends' ? (
          <FriendsSection theme={theme} />
        ) : activeTab === 'files' ? (
          <FilesSection theme={theme} />
        ) : (
          // Dashboard Home Section
          <div className="w-full px-10 py-12">
          {/* Header */}
          <div className="flex justify-between items-end mb-10">
            <div>
              <h1 className={`text-3xl font-black tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Welcome back, {user?.email?.split('@')[0] || 'User'}.
              </h1>
              <p className={`text-base mt-2 font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formattedDate}{' '}
                <span className={`mx-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}>|</span>{' '}
                <span className={theme === 'pinktasha' ? 'text-[#F13E93]' : 'text-[#43A6FF]'}>{formattedTime}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsTimeModalOpen(true)}
                className={`flex items-center text-white px-6 py-3.5 rounded-full font-bold transition-transform hover:scale-[1.02] shadow-sm ${
                  theme === 'pinktasha' 
                    ? 'bg-[#F13E93] hover:bg-[#d62d7a] shadow-pink-200' 
                    : 'bg-[#43A6FF] hover:bg-[#3490E5] shadow-blue-200'
                }`}
              >
                <PlusIcon />
                <span className="ml-4">Track Time</span>
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-gray-400 hover:opacity-80 transition-opacity p-2"
              >
                <SettingsIcon className="w-8 h-8" />
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Time Progress Widget */}
            <div className={`rounded-[24px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] lg:col-span-2 transition-all hover:translate-y-[-4px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] duration-300 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    theme === 'pinktasha'
                      ? 'bg-[#F13E93]/10 text-[#F13E93]'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-[#43A6FF]'
                      : 'bg-[#43A6FF]/10 text-[#43A6FF]'
                  }`}>
                    <ClockIcon className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Time Progress</h2>
                  <span className={`ml-4 border font-bold px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all hover:scale-105 ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-gray-400'
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}>
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {weeksLeft > 0 ? formattedEstDate : 'Complete!'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-end gap-10 mb-8">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      theme === 'pinktasha'
                        ? 'bg-green-100 text-green-600'
                        : theme === 'dark'
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      <CheckCircleIcon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Done</p>
                  </div>
                  <div className="flex items-baseline">
                    <span className={`text-6xl font-black tracking-tighter ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {completedHours}
                    </span>
                    <span className="ml-2 text-xl font-medium text-gray-400">hrs</span>
                  </div>
                </div>

                <div className={`px-6 py-4 rounded-2xl border min-w-[160px] transition-all hover:shadow-md hover:scale-105 ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 hover:border-gray-500'
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      theme === 'pinktasha'
                        ? 'bg-orange-100 text-orange-600'
                        : theme === 'dark'
                        ? 'bg-orange-900/30 text-orange-400'
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      <ClockIcon className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">Remaining</p>
                  </div>
                  <span className={`text-3xl font-black tracking-tight ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {remainingHours.toFixed(1)}
                  </span>
                  <span className="ml-1 text-sm text-gray-400">hrs</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={`w-full rounded-full h-4 overflow-hidden relative ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                    theme === 'pinktasha' ? 'bg-[#F13E93]' : 'bg-[#43A6FF]'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/20 skew-x-[-20deg]"></div>
                </div>
              </div>

              {/* Progress Description, Quote & Goal */}
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    theme === 'pinktasha' ? 'bg-[#F13E93]' : 'bg-[#43A6FF]'
                  }`}></div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {progressPercentage.toFixed(1)}% completed · {remainingHours.toFixed(1)} hrs to go
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Daily Quote */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}>
                    {renderQuoteIcon(todayQuote.icon)}
                    <p className={`text-xs font-medium italic ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {todayQuote.quote}
                    </p>
                  </div>
                  {/* Goal Chip */}
                  <span className={`font-bold px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition-all hover:scale-105 ${
                    theme === 'pinktasha'
                      ? 'bg-[#F9D0CD] text-[#F13E93]'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-[#43A6FF]'
                      : 'bg-[#FDFCE9] text-[#43A6FF]'
                  }`}>
                    <BriefcaseIcon className="w-3 h-3" />
                    {requiredHours}h · {workHoursPerDay}h/day
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Widget */}
            <div className={`rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col transition-all hover:translate-y-[-4px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] duration-300 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* Header Row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    theme === 'pinktasha'
                      ? 'bg-[#F13E93]/10 text-[#F13E93]'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-[#43A6FF]'
                      : 'bg-[#43A6FF]/10 text-[#43A6FF]'
                  }`}>
                    <BriefcaseIcon className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Activity</h2>
                </div>
                {/* Status Badge */}
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  todayEntry?.clock_in && !todayEntry?.clock_out
                    ? 'bg-green-100 text-green-700'
                    : todayEntry?.clock_out
                    ? theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                    : 'bg-red-100 text-red-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    todayEntry?.clock_in && !todayEntry?.clock_out
                      ? 'bg-green-500'
                      : todayEntry?.clock_out
                      ? 'bg-gray-400'
                      : 'bg-red-500'
                  }`}></span>
                  {todayEntry?.clock_in && !todayEntry?.clock_out
                    ? 'Active'
                    : todayEntry?.clock_out
                    ? 'Done'
                    : 'Inactive'}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1">
                {/* Status Card */}
                <div className={`rounded-2xl p-4 mb-3 ${
                  todayEntry?.clock_in && !todayEntry?.clock_out
                    ? theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-100'
                    : todayEntry?.clock_out
                    ? theme === 'dark' ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-100'
                    : theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium mb-1 ${
                        todayEntry?.clock_in && !todayEntry?.clock_out
                          ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          : todayEntry?.clock_out
                          ? theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`}>
                        Current Status
                      </p>
                      <p className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {todayEntry?.clock_in && !todayEntry?.clock_out
                          ? 'On Shift'
                          : todayEntry?.clock_out
                          ? 'Shift Complete'
                          : 'Off Shift'}
                      </p>
                    </div>
                    {/* Status Indicator - Minimal Design */}
                    <div className="relative flex h-5 w-5">
                      {todayEntry?.clock_in && !todayEntry?.clock_out ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-2 border-white"></span>
                        </>
                      ) : todayEntry?.clock_out ? (
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-gray-400 border-2 border-white"></span>
                      ) : (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-white"></span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Elapsed Time - Show when on shift, placeholder when not */}
                  <div className="mt-3 pt-3 border-t border-green-200/50">
                    <p className="text-xs text-gray-500 mb-1">
                      {todayEntry?.clock_in && !todayEntry?.clock_out
                        ? 'Time Elapsed'
                        : todayEntry?.clock_out
                        ? 'Hours Today'
                        : 'Last Session'}
                    </p>
                    <p className={`text-lg font-mono font-bold ${
                      todayEntry?.clock_in && !todayEntry?.clock_out
                        ? theme === 'pinktasha' ? 'text-[#F13E93]' : 'text-[#43A6FF]'
                        : todayEntry?.clock_out
                        ? 'text-gray-900'
                        : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {todayEntry?.clock_in && !todayEntry?.clock_out
                        ? elapsedTime
                        : todayEntry?.clock_out
                        ? `${todayEntry.hours_worked?.toFixed(2)} hrs`
                        : '00:00:00'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Action Button - Always show, different states */}
              {todayEntry?.clock_in && !todayEntry?.clock_out ? (
                <button
                  onClick={handleClockOut}
                  disabled={isProcessing}
                  className={`end-shift-btn w-full font-bold py-3 rounded-full transition-all mt-5 border flex items-center justify-center gap-2 text-sm ${
                    isProcessing
                      ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-white border-gray-600'
                      : 'bg-gray-50 text-gray-900 border-gray-100'
                  }`}
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>{isProcessing ? 'Processing...' : 'End Shift'}</span>
                </button>
              ) : todayEntry?.clock_out ? (
                <div className={`w-full py-3 rounded-full mt-5 border flex items-center justify-center gap-2 text-sm ${
                  theme === 'dark'
                    ? 'bg-green-900/30 border-green-700 text-green-400'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="font-bold">Completed</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsTimeModalOpen(true)}
                  className={`w-full font-bold py-3 rounded-full transition-all mt-5 text-white flex items-center justify-center gap-2 text-sm ${
                    theme === 'pinktasha'
                      ? 'bg-[#F13E93] hover:bg-[#d62d7a] shadow-pink-200'
                      : 'bg-[#43A6FF] hover:bg-[#3490E5] shadow-blue-200'
                  } hover:scale-[1.02] hover:shadow-lg shadow-sm`}
                >
                  <ClockIcon className="w-4 h-4" />
                  Clock In
                </button>
              )}
            </div>

            {/* Friends Widget */}
            <div className={`rounded-[24px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all hover:translate-y-[-4px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] duration-300 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    theme === 'pinktasha'
                      ? 'bg-[#F13E93]/10 text-[#F13E93]'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-[#43A6FF]'
                      : 'bg-[#43A6FF]/10 text-[#43A6FF]'
                  }`}>
                    <UsersIcon className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Friends</h2>
                </div>
                <button className={`p-2 rounded-lg transition-all hover:scale-110 ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'
                }`}>
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {friends.map((friend, i) => (
                  <div
                    key={i}
                    className={`flex items-center group cursor-pointer p-4 rounded-2xl border transition-all hover:scale-[1.02] hover:shadow-md ${
                      theme === 'dark'
                        ? 'bg-gray-700/50 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
                        : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="relative">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm transition-transform group-hover:scale-110 ${friend.color}`}
                      >
                        {friend.name.charAt(0)}
                      </div>
                      {friend.active && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{friend.name}</p>
                      <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {friend.active ? 'Active now' : 'Last seen recently'}
                      </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      friend.active
                        ? theme === 'pinktasha'
                          ? 'bg-[#F9D0CD] text-[#F13E93]'
                          : theme === 'dark'
                          ? 'bg-[#43A6FF]/20 text-[#43A6FF]'
                          : 'bg-[#43A6FF]/10 text-[#43A6FF]'
                        : theme === 'dark'
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {friend.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Files Widget */}
            <div className={`rounded-[24px] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] lg:col-span-2 transition-all hover:translate-y-[-4px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] duration-300 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    theme === 'pinktasha'
                      ? 'bg-[#F13E93]/10 text-[#F13E93]'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-[#43A6FF]'
                      : 'bg-[#43A6FF]/10 text-[#43A6FF]'
                  }`}>
                    <FolderIcon className="w-5 h-5" />
                  </div>
                  <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Recent Files</h2>
                </div>
                <button className={`text-sm font-bold transition-colors px-4 py-1.5 rounded-full ${
                  theme === 'pinktasha'
                    ? 'text-[#F13E93] hover:text-[#d62d7a] bg-[#F9D0CD]'
                    : theme === 'dark'
                    ? 'text-[#43A6FF] hover:text-[#3490E5] bg-gray-700'
                    : 'text-[#43A6FF] hover:text-[#3490E5] bg-blue-50'
                }`}>
                  View All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`flex items-center p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 hover:border-gray-500 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                    theme === 'dark' ? 'bg-gray-600' : 'bg-white'
                  } ${theme === 'pinktasha' ? 'text-[#F13E93]' : 'text-[#43A6FF]'}`}>
                    <FileIcon />
                  </div>
                  <div className="ml-4">
                    <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Week 4 Report.pdf</p>
                    <p className={`text-sm font-medium mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved today</p>
                  </div>
                </div>

                <div className={`flex items-center p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 hover:border-gray-500 hover:bg-gray-600'
                    : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:bg-white'
                }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-colors ${
                    theme === 'dark' ? 'bg-gray-600 text-gray-400' : 'bg-white text-gray-400'
                  }`}>
                    <FileIcon />
                  </div>
                  <div className="ml-4">
                    <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Evaluation Form.docx</p>
                    <p className={`text-sm font-medium mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Added yesterday</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          />
          <div className={`relative rounded-[24px] p-8 shadow-2xl w-full max-w-md mx-4 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Settings</h2>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className={`text-sm font-medium mb-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>Choose Theme</p>

              {/* Light Mode Option */}
              <button
                onClick={() => setTheme('light')}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                  theme === 'light' 
                    ? 'border-[#43A6FF] bg-blue-50' 
                    : theme === 'dark'
                    ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#FDFCE9] border border-gray-200 shadow-sm" />
                <div className="text-left">
                  <p className={`font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Light Mode</p>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Classic bright theme</p>
                </div>
                {theme === 'light' && (
                  <div className="ml-auto w-6 h-6 rounded-full bg-[#43A6FF] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>

              {/* Dark Mode Option */}
              <button
                onClick={() => setTheme('dark')}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                  theme === 'dark' 
                    ? 'border-[#43A6FF] bg-gray-700' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-600 shadow-sm" />
                <div className="text-left">
                  <p className={`font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Dark Mode</p>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Easy on the eyes</p>
                </div>
                {theme === 'dark' && (
                  <div className="ml-auto w-6 h-6 rounded-full bg-[#43A6FF] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>

              {/* PinkTasha Theme Option */}
              <button
                onClick={() => setTheme('pinktasha')}
                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                  theme === 'pinktasha' 
                    ? 'border-[#F13E93] bg-[#F9D0CD]' 
                    : theme === 'dark'
                    ? 'border-gray-600 bg-gray-700 hover:bg-gray-600'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F13E93] via-[#F891BB] to-[#FAFFCB] shadow-sm" />
                <div className="text-left">
                  <p className={`font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>PinkTasha</p>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>Pink & yellow palette</p>
                </div>
                {theme === 'pinktasha' && (
                  <div className="ml-auto w-6 h-6 rounded-full bg-[#F13E93] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Tracking Modal - Enhanced */}
      {isTimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsTimeModalOpen(false)}
          />
          <div className={`relative rounded-[24px] p-6 shadow-2xl w-full max-w-md mx-4 ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
            {/* Header with Icon */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  theme === 'pinktasha'
                    ? 'bg-[#F13E93]/10 text-[#F13E93]'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-[#43A6FF]'
                      : 'bg-[#43A6FF]/10 text-[#43A6FF]'
                }`}>
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Time Tracking</h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTimeModalOpen(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                    : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Error message */}
            {timeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 text-sm">{timeError}</p>
              </div>
            )}

            {/* Today's Status - Enhanced */}
            <div className={`mb-5 p-4 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-gray-700/50 border-gray-600'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${
                  todayEntry?.clock_out
                    ? 'bg-green-500'
                    : todayEntry?.clock_in
                      ? 'bg-orange-500 animate-pulse'
                      : 'bg-gray-400'
                }`} />
                <p className={`text-xs font-bold uppercase tracking-wide ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {todayEntry?.clock_out
                    ? 'Shift Complete'
                    : todayEntry?.clock_in
                      ? 'On Shift'
                      : 'Not Started'
                  }
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ${
                    todayEntry?.clock_in
                      ? 'bg-green-100 text-green-600'
                      : theme === 'dark'
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-gray-200 text-gray-400'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <p className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {todayEntry?.clock_in
                      ? new Date(todayEntry.clock_in).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : '--:--'
                    }
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Clock In</p>
                </div>

                <div className="flex items-center justify-center px-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="flex-1 text-right">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1 ml-auto ${
                    todayEntry?.clock_out
                      ? 'bg-orange-100 text-orange-600'
                      : theme === 'dark'
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-gray-200 text-gray-400'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                    </svg>
                  </div>
                  <p className={`text-xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {todayEntry?.clock_out
                      ? new Date(todayEntry.clock_out).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : '--:--'
                    }
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Clock Out</p>
                </div>
              </div>

              {/* Hours Worked Badge */}
              <div className={`mt-4 pt-3 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                      <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Hours Worked
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {todayEntry?.hours_worked?.toFixed(2) || '0.00'}
                    </span>
                    <span className="text-sm text-gray-400">hrs</span>
                    {todayEntry?.is_auto_clock_out && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                        Auto
                      </span>
                    )}
                    {todayEntry?.manual_entry && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                        Manual
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Clock In/Out Buttons - Enhanced */}
            {!isEditMode ? (
              <div className="space-y-3">
                {!todayEntry?.clock_in ? (
                  <button
                    onClick={handleClockIn}
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-green-200/50 ${
                      isProcessing
                        ? 'bg-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Clock In
                      </>
                    )}
                  </button>
                ) : !todayEntry?.clock_out ? (
                  <button
                    onClick={handleClockOut}
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-orange-200/50 ${
                      isProcessing
                        ? 'bg-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                        </svg>
                        Clock Out
                      </>
                    )}
                  </button>
                ) : (
                  <div className={`p-4 rounded-xl flex items-center justify-center gap-2 ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <p className={`font-bold ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-700'
                    }`}>
                      Completed {todayEntry?.hours_worked?.toFixed(2)} hrs today!
                    </p>
                  </div>
                )}

                {/* Edit Mode Toggle - Enhanced */}
                <button
                  onClick={() => setIsEditMode(true)}
                  className={`w-full py-3.5 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Add/Edit Hours Manually
                </button>
              </div>
            ) : (
              /* Manual Hours Input - Enhanced UI */
              <div className="space-y-5">
                {/* Header with icon */}
                <div className={`flex items-center gap-3 pb-3 border-b ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isBulkMode
                      ? theme === 'pinktasha' ? 'bg-[#F13E93]/10 text-[#F13E93]' : 'bg-[#43A6FF]/10 text-[#43A6FF]'
                      : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isBulkMode ? <BriefcaseIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {isBulkMode ? 'Bulk Hours Entry' : 'Daily Hours Entry'}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {isBulkMode ? 'Log your total rendered hours' : 'Log hours for a specific date'}
                    </p>
                  </div>
                </div>

                {/* Bulk Mode Toggle - Enhanced */}
                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isBulkMode
                    ? theme === 'pinktasha'
                      ? 'bg-[#F13E93]/5 border-[#F13E93]/30'
                      : 'bg-[#43A6FF]/5 border-[#43A6FF]/30'
                    : theme === 'dark'
                      ? 'bg-gray-700/50 border-gray-600'
                      : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isBulkMode
                        ? theme === 'pinktasha' ? 'bg-[#F13E93] text-white' : 'bg-[#43A6FF] text-white'
                        : theme === 'dark' ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-500'
                    }`}>
                      <BriefcaseIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Already Rendered Mode
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isBulkMode ? 'No date required' : 'Toggle for bulk entry'}
                      </p>
                    </div>
                  </div>
                  <div
                    onClick={() => {
                      const newMode = !isBulkMode
                      setIsBulkMode(newMode)
                      // Clear input when switching from bulk mode to daily mode (or vice versa)
                      // to prevent invalid values carrying over
                      setManualHours('')
                      setTimeError('')
                    }}
                    className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors duration-300 ${
                      isBulkMode
                        ? theme === 'pinktasha' ? 'bg-[#F13E93]' : 'bg-[#43A6FF]'
                        : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
                        isBulkMode ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Date picker - only show when not in bulk mode */}
                {!isBulkMode && (
                  <div className={`p-4 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-700/50 border-gray-600'
                      : 'bg-white border-gray-200 shadow-sm'
                  }`}>
                    <label className={`flex items-center gap-2 text-sm font-bold mb-3 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <CalendarIcon className="w-4 h-4" />
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={manualEntryDate}
                      onChange={(e) => setManualEntryDate(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors font-medium ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF]'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#43A6FF]'
                      }`}
                    />
                    <p className={`text-xs mt-2 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <ClockIcon className="w-3 h-3" />
                      Choose any date: past, today, or future
                    </p>
                  </div>
                )}

                {/* Hours Input - Enhanced */}
                <div className={`p-4 rounded-xl border transition-all ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 border-gray-600'
                    : 'bg-white border-gray-200 shadow-sm'
                }`}>
                  <label className={`flex items-center gap-2 text-sm font-bold mb-3 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <ClockIcon className="w-4 h-4" />
                    Hours Worked
                    {isBulkMode && (
                      <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${
                        theme === 'pinktasha'
                          ? 'bg-[#F13E93]/10 text-[#F13E93]'
                          : 'bg-[#43A6FF]/10 text-[#43A6FF]'
                      }`}>
                        Total
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={manualHours}
                      onChange={(e) => {
                        const val = e.target.value
                        // Only allow numbers and one decimal point
                        if (!/^\d*\.?\d*$/.test(val)) {
                          return
                        }
                        if (val === '') {
                          setManualHours('')
                          return
                        }
                        const num = parseFloat(val)
                        if (!isNaN(num)) {
                          const requiredHours = ojtConfig?.total_required_hours ?? 500
                          const completedHours = ojtConfig?.completed_hours ?? 0
                          const remaining = requiredHours - completedHours

                          // Enforce max 24 in non-bulk mode during typing
                          if (!isBulkMode && num > 24) {
                            setManualHours('24')
                          }
                          // In bulk mode, enforce that input doesn't exceed remaining required hours
                          else if (isBulkMode && num > remaining) {
                            setManualHours(remaining.toFixed(1))
                          }
                          else {
                            setManualHours(val)
                          }
                        }
                      }}
                      placeholder={isBulkMode ? 'e.g., 369.9' : 'e.g., 8'}
                      className={`w-full px-4 py-3 pr-12 rounded-xl border-2 focus:outline-none transition-colors font-bold text-lg ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF]'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#43A6FF]'
                      }`}
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      hrs
                    </span>
                  </div>
                  {isBulkMode && (
                    <p className={`text-xs mt-2 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      <BriefcaseIcon className="w-3 h-3" />
                      Enter total hours already completed (no daily limit)
                    </p>
                  )}
                </div>

                {/* Action Buttons - Enhanced */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleManualHoursSubmit}
                    disabled={isProcessing || !manualHours}
                    className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 ${
                      isProcessing || !manualHours
                        ? 'bg-gray-400 cursor-not-allowed shadow-none'
                        : theme === 'pinktasha'
                          ? 'bg-[#F13E93] hover:bg-[#d62d7a] hover:shadow-pink-200/50'
                          : 'bg-[#43A6FF] hover:bg-[#3490E5]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        Save Hours
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditMode(false)
                      setManualHours('')
                      setManualEntryDate(new Date().toISOString().split('T')[0])
                      setIsBulkMode(false)
                      setTimeError('')
                    }}
                    className={`flex-1 py-3.5 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Info Note */}
            <p className={`mt-4 text-xs text-center ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              Auto clock-out occurs after your scheduled work hours ({ojtConfig?.work_hours_per_day || 8}h) from clock-in time.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
