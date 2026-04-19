import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, hasOJTConfig } from '../lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL (Supabase handles the OAuth callback)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError
        
        if (session?.user) {
          // Check if user has OJT config
          const hasConfig = await hasOJTConfig()
          if (hasConfig) {
            navigate('/')
          } else {
            navigate('/onboarding')
          }
        } else {
          // No session, redirect to login
          navigate('/login')
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication failed'
        setError(message)
        setTimeout(() => navigate('/login'), 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFCE9] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFCE9] flex items-center justify-center">
      <div className="text-center max-w-sm w-full mx-4">
        {/* Logo skeleton */}
        <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse mx-auto mb-6" />
        
        {/* Title skeleton */}
        <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-48 mx-auto mb-3" />
        
        {/* Subtitle skeleton */}
        <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mx-auto mb-8" />
        
        {/* Progress bars */}
        <div className="space-y-3 max-w-xs mx-auto">
          <div className="h-2 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-2 bg-gray-200 rounded-full animate-pulse w-3/4 mx-auto" />
        </div>
        
        <p className="text-gray-500 text-sm mt-6 font-medium">Completing sign in...</p>
      </div>
    </div>
  )
}
