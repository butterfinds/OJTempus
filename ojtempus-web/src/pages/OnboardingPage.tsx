import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BriefcaseIcon, ClockIcon, CalendarIcon } from '../components/Icons'
import { hasOJTConfig, updateOJTConfig, supabase } from '../lib/supabase'
import { useSuccessWithTheme } from '../contexts/SuccessContext'

export function OnboardingPage() {
  const navigate = useNavigate()
  const { showSuccess } = useSuccessWithTheme('light')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const [config, setConfig] = useState({
    total_required_hours: 500,
    work_hours_per_day: 8,
    work_days_per_week: 5,
  })

  // Handle input change with validation
  const handleInputChange = (field: keyof typeof config, value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '')
    
    let limitedValue: string
    let maxValue: number
    
    // Apply field-specific restrictions
    switch (field) {
      case 'total_required_hours':
        limitedValue = numericValue.slice(0, 4) // Max 4 digits
        maxValue = 9999
        break
      case 'work_hours_per_day':
        limitedValue = numericValue.slice(0, 2) // Max 2 digits (24)
        maxValue = 24
        break
      case 'work_days_per_week':
        limitedValue = numericValue.slice(0, 1) // Max 1 digit (7)
        maxValue = 7
        break
      default:
        limitedValue = numericValue
        maxValue = Infinity
    }
    
    // Convert to number and apply max value
    let numValue = limitedValue === '' ? 0 : parseInt(limitedValue, 10)
    if (numValue > maxValue) numValue = maxValue
    
    setConfig(prev => ({ ...prev, [field]: numValue }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate inputs
      if (config.total_required_hours <= 0) {
        throw new Error('Total required hours must be greater than 0')
      }
      if (config.work_hours_per_day <= 0 || config.work_hours_per_day > 24) {
        throw new Error('Work hours per day must be between 1 and 24')
      }
      if (config.work_days_per_week < 1 || config.work_days_per_week > 7) {
        throw new Error('Work days per week must be between 1 and 7')
      }

      // Save to Supabase
      await updateOJTConfig(config)

      const { data: { user } } = await supabase.auth.getUser()
      const configExists = await hasOJTConfig(user?.id)
      if (!configExists) {
        throw new Error('Saved, but no OJT configuration was found. Please try again.')
      }
      
      showSuccess('Setup Complete!', 'Your OJT configuration has been saved. Welcome to OJTempus!')
      // Redirect to dashboard
      navigate('/')
    } catch (err: unknown) {
      console.error('Full error:', err)
      const maybeSupabaseError = err as { message?: string; details?: string; hint?: string; code?: string }
      const message =
        err instanceof Error
          ? err.message
          : maybeSupabaseError?.message || 'Failed to save OJT configuration'

      const parts = [message]
      if (maybeSupabaseError?.code) parts.push(`code: ${maybeSupabaseError.code}`)
      if (maybeSupabaseError?.details) parts.push(maybeSupabaseError.details)
      if (maybeSupabaseError?.hint) parts.push(maybeSupabaseError.hint)
      setError(`Error: ${parts.join(' | ')}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate estimated weeks to complete
  const weeklyHours = config.work_hours_per_day * config.work_days_per_week
  const estimatedWeeks = weeklyHours > 0 
    ? Math.ceil(config.total_required_hours / weeklyHours) 
    : 0

  return (
    <div className="min-h-screen bg-[#FDFCE9] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(68, 172, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(68, 172, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridMove 20s linear infinite',
          }}
        />
        <style>{`
          @keyframes gridMove {
            0% {
              transform: translate(0, 0);
            }
            100% {
              transform: translate(50px, 50px);
            }
          }
          @keyframes iconBounce {
            0% { transform: translateY(-50%); }
            50% { transform: translateY(calc(-50% - 6px)); }
            100% { transform: translateY(-50%); }
          }
          .icon-bounce {
            animation: iconBounce 0.4s ease-out forwards;
          }
        `}</style>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#44ACFF] rounded-full flex items-center justify-center mx-auto mb-4">
            <BriefcaseIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Setup Your OJT
          </h1>
          <p className="text-gray-600 text-sm">
            Enter your OJT requirements to track your progress
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Total Required Hours */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Total Required Hours
            </label>
            <div className="relative">
              <ClockIcon 
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 ${focusedInput === 'hours' ? 'icon-bounce' : ''}`} 
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={config.total_required_hours || ''}
                onChange={(e) => handleInputChange('total_required_hours', e.target.value)}
                onFocus={() => setFocusedInput('hours')}
                onBlur={() => setFocusedInput(null)}
                maxLength={4}
                placeholder="e.g., 500"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#44ACFF] focus:outline-none transition-colors text-gray-700 placeholder:text-gray-400"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-1">
              Total hours required to complete your OJT program
            </p>
          </div>

          {/* Work Hours Per Day */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Work Hours Per Day
            </label>
            <div className="relative">
              <ClockIcon 
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 ${focusedInput === 'daily' ? 'icon-bounce' : ''}`} 
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={config.work_hours_per_day || ''}
                onChange={(e) => handleInputChange('work_hours_per_day', e.target.value)}
                onFocus={() => setFocusedInput('daily')}
                onBlur={() => setFocusedInput(null)}
                maxLength={2}
                placeholder="e.g., 8"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#44ACFF] focus:outline-none transition-colors text-gray-700 placeholder:text-gray-400"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-1">
              Typical hours you work each day (e.g., 8 hours)
            </p>
          </div>

          {/* Work Days Per Week */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Work Days Per Week
            </label>
            <div className="relative">
              <CalendarIcon 
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 ${focusedInput === 'weekly' ? 'icon-bounce' : ''}`} 
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={config.work_days_per_week || ''}
                onChange={(e) => handleInputChange('work_days_per_week', e.target.value)}
                onFocus={() => setFocusedInput('weekly')}
                onBlur={() => setFocusedInput(null)}
                maxLength={1}
                placeholder="e.g., 5"
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#44ACFF] focus:outline-none transition-colors text-gray-700 placeholder:text-gray-400"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-1">
              Days you work per week (e.g., 5 for Mon-Fri)
            </p>
          </div>

          {/* Summary Card */}
          <div className="bg-[#44ACFF]/10 rounded-xl p-4 border border-[#44ACFF]/20">
            <h3 className="font-semibold text-[#44ACFF] mb-2 text-sm">Estimated Timeline</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">{weeklyHours}</span> hours per week
              </p>
              <p className="text-gray-700">
                <span className="font-medium">{estimatedWeeks}</span> weeks estimated to complete
              </p>
              <p className="text-gray-700">
                <span className="font-medium">{Math.ceil(estimatedWeeks / 4)}</span> months estimated
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 py-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-4 bg-[#44ACFF] hover:bg-[#3A9BEF] active:bg-[#2E8BDF] text-white rounded-full font-bold text-sm transition-all duration-200 disabled:opacity-70 shadow-md hover:shadow-lg active:shadow-xl active:scale-[0.98] hover:-translate-y-0.5"
          >
            {isLoading ? 'Saving...' : 'Continue to Dashboard'}
          </button>

          {/* Sign Out Button (for testing) */}
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              navigate('/login')
            }}
            className="w-full py-3 px-4 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Sign Out (Test)
          </button>
        </form>
      </div>
    </div>
  )
}
