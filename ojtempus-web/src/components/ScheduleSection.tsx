import { useState, useEffect } from 'react'
import { 
  CalendarIcon, 
  PlusIcon, 
  TrashIcon, 
  CheckIcon, 
  ClockIcon,
  HistoryIcon,
  EditIcon,
  AlertCircleIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '../components/Icons'
import { useSuccessWithTheme } from '../contexts/SuccessContext'
import { 
  type WorkSchedule, 
  type EditLog,
  getWorkSchedules, 
  createWorkSchedule, 
  updateWorkSchedule, 
  deleteWorkSchedule,
  getEditLogsWithEntryDetails,
  updateEditLog
} from '../lib/supabase'
import { ScheduleSkeleton } from './Skeleton'
import { ScheduleNotificationPanel } from './ScheduleNotification'

type Theme = 'light' | 'dark' | 'pinktasha'

interface ScheduleSectionProps {
  theme: Theme
}

export function ScheduleSection({ theme }: ScheduleSectionProps) {
  const { showSuccess } = useSuccessWithTheme(theme)
  
  // State for schedules
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [hoveredSchedule, setHoveredSchedule] = useState<string | null>(null)
  
  // State for form
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    estimated_hours: 8,
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // State for edit logs
  const [editLogs, setEditLogs] = useState<(EditLog & { entry_date: string })[]>([])
  const [logsExpanded, setLogsExpanded] = useState(false)
  const [editingLogId, setEditingLogId] = useState<string | null>(null)
  const [logNotes, setLogNotes] = useState('')
  const [isSavingLogNotes, setIsSavingLogNotes] = useState(false)
  
  // Live countdown timer for upcoming schedules
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  
  // Fetch data on mount
  useEffect(() => {
    fetchData()
  }, [])
  
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [schedulesData, logsData] = await Promise.all([
        getWorkSchedules(),
        getEditLogsWithEntryDetails()
      ])
      setSchedules(schedulesData)
      setEditLogs(logsData)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.scheduled_date) return
    
    setIsSubmitting(true)
    try {
      await createWorkSchedule({
        ...formData,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        priority: formData.priority,
        status: 'pending',
        estimated_hours: formData.estimated_hours || 0,
        actual_hours: 0,
        notes: formData.notes || null
      })
      
      // Show success immediately before fetch to avoid delay
      showSuccess('Schedule Created!', `Your schedule "${formData.title}" has been added successfully.`)
      
      await fetchData()
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        priority: 'medium',
        estimated_hours: 8,
        notes: ''
      })
      setIsFormOpen(false)
      await fetchData()
    } catch (err) {
      console.error('Error creating schedule:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create schedule'
      setError(`Failed to create schedule: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle schedule status update
  const handleStatusChange = async (id: string, newStatus: 'in_progress' | 'completed' | 'cancelled') => {
    try {
      await updateWorkSchedule(id, { status: newStatus })
      await fetchData()
      const statusMessages = {
        'in_progress': 'Started working on schedule!',
        'completed': 'Schedule marked as completed! Great work!',
        'cancelled': 'Schedule cancelled.'
      }
      showSuccess('Status Updated!', statusMessages[newStatus])
    } catch (err) {
      console.error('Error updating schedule:', err)
      setError('Failed to update schedule')
    }
  }
  
  // Handle schedule deletion
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return
    
    try {
      await deleteWorkSchedule(id)
      await fetchData()
      showSuccess('Schedule Deleted!', 'The schedule has been removed successfully.')
    } catch (err) {
      console.error('Error deleting schedule:', err)
      setError('Failed to delete schedule')
    }
  }
  
  // Handle adding notes to edit log
  const handleEditLogNotes = async (logId: string) => {
    if (logNotes.length > 500) {
      setError('Notes cannot exceed 500 characters')
      return
    }
    
    setIsSavingLogNotes(true)
    try {
      await updateEditLog(logId, { notes: logNotes || null })
      await fetchData()
      setEditingLogId(null)
      setLogNotes('')
      showSuccess('Notes Saved!', 'Your notes have been added to the edit log.')
    } catch (err) {
      console.error('Error updating log notes:', err)
      setError('Failed to save notes')
    } finally {
      setIsSavingLogNotes(false)
    }
  }
  
  const startEditingLog = (log: EditLog) => {
    setEditingLogId(log.id)
    setLogNotes(log.notes || '')
  }
  
  // Calculate live time remaining
  const getTimeRemaining = (schedule: WorkSchedule) => {
    const scheduleDate = new Date(schedule.scheduled_date)
    const [hours, minutes] = (schedule.start_time || '09:00').split(':').map(Number)
    scheduleDate.setHours(hours, minutes, 0, 0)
    
    const diffMs = scheduleDate.getTime() - currentTime.getTime()
    
    if (diffMs <= 0) return null
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    
    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24)
      return `in ${days} day${days === 1 ? '' : 's'}`
    }
    return `${diffHours.toString().padStart(2, '0')}:${diffMinutes.toString().padStart(2, '0')}:${diffSeconds.toString().padStart(2, '0')}`
  }
  
  // Priority color helper with enhanced styles
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400 shadow-red-200'
      case 'high': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-400 shadow-orange-200'
      case 'medium': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-blue-200'
      case 'low': return 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400 shadow-green-200'
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-400'
    }
  }
  
  // Status color helper with live pulse effect
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'cancelled': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }
  
  // Format date helper
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  // Edit log type color helper
  const getEditTypeColor = (type: string) => {
    switch (type) {
      case 'manual_entry': return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
      case 'hours_adjustment': return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
      case 'correction': return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
      case 'bulk_entry': return 'bg-gradient-to-r from-pink-500 to-pink-600 text-white'
      case 'clock_out': return 'bg-gradient-to-r from-green-500 to-green-600 text-white'
      case 'auto_clock_out': return 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
    }
  }
  
  // Edit log type label helper
  const getEditTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  
  // Separate upcoming and past schedules
  const today = new Date().toISOString().split('T')[0]
  const upcomingSchedules = schedules.filter(s => s.scheduled_date >= today && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
  const pastSchedules = schedules.filter(s => s.scheduled_date < today || s.status === 'cancelled' || s.status === 'completed')
  
  if (isLoading) {
    return <ScheduleSkeleton theme={theme} />
  }

  return (
    <div className="w-full px-10 py-12">
      {/* Notification Panel */}
      <ScheduleNotificationPanel schedules={schedules} theme={theme} />
      
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Work Schedules.
          </h1>
          <p className={`text-base mt-2 font-medium ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Plan and track your upcoming work tasks.
          </p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className={`flex items-center text-white px-6 py-3.5 rounded-full font-bold transition-all hover:scale-[1.02] hover:shadow-lg shadow-sm ${
            theme === 'pinktasha' 
              ? 'bg-gradient-to-r from-[#F13E93] to-[#d62d7a] shadow-pink-200' 
              : 'bg-gradient-to-r from-[#43A6FF] to-[#3490E5] shadow-blue-200'
          }`}
        >
          <PlusIcon />
          <span className="ml-2">Add Schedule</span>
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-100 text-red-700 font-medium flex items-center gap-2 animate-in slide-in-from-top">
          <AlertCircleIcon className="w-5 h-5" />
          {error}
          <button onClick={() => setError('')} className="ml-auto hover:bg-red-200 p-1 rounded-lg transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Schedule Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsFormOpen(false)}
          />
          <div className={`relative rounded-[24px] p-8 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Add New Schedule</h2>
              <button 
                onClick={() => setIsFormOpen(false)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'
                }`}
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Title *</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Project Review Meeting"
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium focus:ring-2 focus:ring-offset-1 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20'
                  }`} 
                />
              </div>
              
              <div>
                <label className={`block text-sm font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the work..."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium resize-none focus:ring-2 focus:ring-offset-1 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20'
                  }`} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Date *</label>
                  <input 
                    type="date" 
                    required
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium focus:ring-2 focus:ring-offset-1 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20'
                    }`} 
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'})}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium focus:ring-2 focus:ring-offset-1 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20'
                    }`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Start Time</label>
                  <input 
                    type="time" 
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium focus:ring-2 focus:ring-offset-1 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20'
                    }`} 
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>End Time</label>
                  <input 
                    type="time" 
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium focus:ring-2 focus:ring-offset-1 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20'
                    }`} 
                  />
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Estimated Hours</label>
                <input 
                  type="number" 
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({...formData, estimated_hours: parseFloat(e.target.value) || 0})}
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium focus:ring-2 focus:ring-offset-1 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20'
                  }`} 
                />
              </div>
              
              <div>
                <label className={`block text-sm font-bold mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-medium resize-none focus:ring-2 focus:ring-offset-1 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-[#43A6FF] focus:ring-[#43A6FF]/20'
                  }`} 
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`flex-1 font-bold py-3.5 rounded-full transition-all hover:scale-[1.02] ${
                    theme === 'dark' 
                      ? 'bg-gray-700 text-white hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 font-bold py-3.5 rounded-full transition-all hover:scale-[1.02] text-white disabled:opacity-50 ${
                    theme === 'pinktasha' 
                      ? 'bg-gradient-to-r from-[#F13E93] to-[#d62d7a] hover:shadow-lg' 
                      : 'bg-gradient-to-r from-[#43A6FF] to-[#3490E5] hover:shadow-lg'
                  }`}
                >
                  {isSubmitting ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedules List */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Upcoming Schedules */}
          <div className={`rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                theme === 'pinktasha' ? 'bg-[#F13E93]/10 text-[#F13E93]' : 'bg-[#43A6FF]/10 text-[#43A6FF]'
              }`}>
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Upcoming Work
              </h2>
              <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
                theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                {upcomingSchedules.length}
              </span>
            </div>
            
            {upcomingSchedules.length === 0 ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <CalendarIcon className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium">No upcoming schedules</p>
                <p className="text-sm mt-1 opacity-70">Click "Add Schedule" to plan your work</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingSchedules.map((schedule, index) => {
                  const timeRemaining = getTimeRemaining(schedule)
                  const isUrgent = timeRemaining && timeRemaining.includes(':') && timeRemaining.startsWith('00')
                  
                  return (
                    <div 
                      key={schedule.id}
                      onMouseEnter={() => setHoveredSchedule(schedule.id)}
                      onMouseLeave={() => setHoveredSchedule(null)}
                      className={`rounded-[20px] p-5 border transition-all duration-300 cursor-pointer group ${
                        hoveredSchedule === schedule.id 
                          ? 'scale-[1.02] shadow-lg' 
                          : 'hover:scale-[1.01] hover:shadow-md'
                      } ${
                        isUrgent 
                          ? theme === 'dark'
                            ? 'bg-gradient-to-br from-red-900/30 to-gray-800 border-red-500/50'
                            : 'bg-gradient-to-br from-red-50 to-white border-red-300'
                          : theme === 'dark' 
                            ? 'bg-gradient-to-br from-gray-700/80 to-gray-800 border-gray-600' 
                            : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
                      }`}
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${getPriorityColor(schedule.priority)}`}>
                            {schedule.priority}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusColor(schedule.status)}`}>
                            {schedule.status}
                          </span>
                          {timeRemaining && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isUrgent 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : theme === 'dark'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-blue-100 text-blue-700'
                            }`}>
                              <ClockIcon className="w-3 h-3" />
                              {timeRemaining}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {schedule.status === 'pending' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(schedule.id, 'in_progress'); }}
                              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                                theme === 'dark' ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-blue-100 text-blue-600'
                              }`}
                              title="Start working"
                            >
                              <ClockIcon className="w-4 h-4" />
                            </button>
                          )}
                          {schedule.status !== 'completed' && schedule.status !== 'cancelled' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(schedule.id, 'completed'); }}
                              className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                                theme === 'dark' ? 'hover:bg-green-500/20 text-green-400' : 'hover:bg-green-100 text-green-600'
                              }`}
                              title="Mark complete"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(schedule.id); }}
                            className={`p-1.5 rounded-lg transition-all hover:scale-110 ${
                              theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'
                            }`}
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {schedule.title}
                      </h3>
                      {schedule.description && (
                        <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {schedule.description}
                        </p>
                      )}
                      
                      <div className={`flex flex-wrap items-center gap-3 text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {formatDate(schedule.scheduled_date)}
                        </span>
                        {schedule.start_time && (
                          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                          }`}>
                            <ClockIcon className="w-3.5 h-3.5" />
                            {schedule.start_time.slice(0, 5)} {schedule.end_time && `- ${schedule.end_time.slice(0, 5)}`}
                          </span>
                        )}
                        {schedule.estimated_hours > 0 && (
                          <span className={`font-medium px-2 py-1 rounded-lg ${
                            theme === 'pinktasha' 
                              ? 'bg-pink-100 text-[#F13E93]' 
                              : 'bg-blue-100 text-[#43A6FF]'
                          }`}>
                            {schedule.estimated_hours}h
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Past/Completed Schedules */}
          {pastSchedules.length > 0 && (
            <div className={`rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Past & Completed
              </h2>
              <div className="space-y-3">
                {pastSchedules.slice(0, 5).map((schedule) => (
                  <div 
                    key={schedule.id}
                    className={`rounded-xl p-4 border ${
                      theme === 'dark' 
                        ? 'bg-gray-700/30 border-gray-600 opacity-60' 
                        : 'bg-gray-50 border-gray-100 opacity-70'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusColor(schedule.status)}`}>
                          {schedule.status}
                        </span>
                        <h4 className={`font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {schedule.title}
                        </h4>
                      </div>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatDate(schedule.scheduled_date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit History Panel */}
        <div className={`rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              theme === 'pinktasha' ? 'bg-[#F13E93]/10 text-[#F13E93]' : 'bg-[#43A6FF]/10 text-[#43A6FF]'
            }`}>
              <HistoryIcon className="w-5 h-5" />
            </div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Edit History
            </h2>
          </div>
          
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Track all hour adjustments and manual entries from your dashboard edits.
          </p>
          
          {editLogs.length === 0 ? (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <EditIcon className="w-7 h-7 opacity-50" />
              </div>
              <p className="text-sm">No edits yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {(logsExpanded ? editLogs : editLogs.slice(0, 3)).map((log, index) => (
                <div 
                  key={log.id}
                  className={`rounded-xl p-4 text-sm border transition-all hover:shadow-md ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-br from-gray-700/80 to-gray-800 border-gray-600 hover:border-gray-500' 
                      : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${getEditTypeColor(log.edit_type)}`}>
                      {getEditTypeLabel(log.edit_type)}
                    </span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(log.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div className={`font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {log.entry_date && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {formatDate(log.entry_date)}
                      </span>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {log.previous_hours !== null ? (
                        <>
                          <span className={`px-2 py-0.5 rounded ${theme === 'dark' ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                            {log.previous_hours}h
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            log.hours_difference > 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {log.new_hours}h
                          </span>
                          <span className={`text-xs font-bold ${
                            log.hours_difference > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ({log.hours_difference > 0 ? '+' : ''}{log.hours_difference}h)
                          </span>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-bold bg-green-100 text-green-700">
                          +{log.new_hours}h added
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {log.reason && (
                    <p className={`text-xs mb-2 px-2 py-1 rounded ${
                      theme === 'dark' ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {log.reason}
                    </p>
                  )}
                  
                  {/* Notes Section */}
                  {editingLogId === log.id ? (
                    <div className="mt-2">
                      <textarea
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="Add your notes or remarks (max 500 chars)..."
                        maxLength={500}
                        rows={3}
                        className={`w-full px-3 py-2 rounded-lg border outline-none transition-all text-sm resize-none ${
                          theme === 'dark' 
                            ? 'bg-gray-800 border-gray-600 text-white focus:border-[#43A6FF]' 
                            : 'bg-white border-gray-200 text-gray-900 focus:border-[#43A6FF]'
                        }`}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className={`text-xs ${
                          logNotes.length >= 450 ? 'text-orange-500' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {logNotes.length}/500
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingLogId(null); setLogNotes(''); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              theme === 'dark' 
                                ? 'hover:bg-gray-700 text-gray-400' 
                                : 'hover:bg-gray-100 text-gray-500'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditLogNotes(log.id)}
                            disabled={isSavingLogNotes || logNotes.length > 500}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all ${
                              theme === 'pinktasha'
                                ? 'bg-[#F13E93] hover:bg-[#d62d7a]'
                                : 'bg-[#43A6FF] hover:bg-[#3490E5]'
                            } disabled:opacity-50`}
                          >
                            {isSavingLogNotes ? 'Saving...' : 'Save Notes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {log.notes ? (
                        <div className={`p-2 rounded-lg text-xs ${
                          theme === 'dark' ? 'bg-blue-900/20 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          <p className="font-medium mb-1">Notes:</p>
                          <p>{log.notes}</p>
                        </div>
                      ) : null}
                      <button
                        onClick={() => startEditingLog(log)}
                        className={`mt-2 flex items-center gap-1 text-xs font-medium transition-colors ${
                          theme === 'dark' 
                            ? 'text-gray-400 hover:text-blue-400' 
                            : 'text-gray-500 hover:text-blue-600'
                        }`}
                      >
                        <EditIcon className="w-3 h-3" />
                        {log.notes ? 'Edit notes' : 'Add notes'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {editLogs.length > 3 && (
                <button 
                  onClick={() => setLogsExpanded(!logsExpanded)}
                  className={`w-full py-3 text-sm font-medium flex items-center justify-center gap-1 transition-all rounded-xl hover:scale-[1.02] ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {logsExpanded ? (
                    <><ChevronUpIcon className="w-4 h-4" /> Show Less</>
                  ) : (
                    <><ChevronDownIcon className="w-4 h-4" /> Show All ({editLogs.length})</>
                  )}
                </button>
              )}
            </div>
          )}
          
          {/* Summary Stats */}
          <div className={`mt-4 pt-4 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
          }`}>
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-xl p-3 ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50'
              }`}>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Edits</p>
                <p className={`text-xl font-bold ${
                  theme === 'pinktasha' ? 'text-[#F13E93]' : 'text-[#43A6FF]'
                }`}>{editLogs.length}</p>
              </div>
              <div className={`rounded-xl p-3 ${
                theme === 'dark' ? 'bg-gray-700/50' : 'bg-green-50'
              }`}>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Hours Added</p>
                <p className="text-xl font-bold text-green-600">
                  +{editLogs.reduce((sum, log) => sum + Math.max(0, log.hours_difference), 0).toFixed(1)}h
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
