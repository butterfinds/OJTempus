import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { hasOJTConfig } from '../lib/supabase'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isInitializing } = useAuth()
  const location = useLocation()
  const [hasConfig, setHasConfig] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    if (user) {
      setIsChecking(true)
      setHasConfig(null)
      const checkConfig = async () => {
        const config = await hasOJTConfig(user.id)
        setHasConfig(config)
        setIsChecking(false)
      }
      checkConfig()
    } else {
      // Reset when user logs out to prevent infinite loading
      setIsChecking(false)
      setHasConfig(null)
    }
  }, [user])

  // Redirect immediately if no user (don't wait for anything)
  if (!user && !isInitializing) {
    return <Navigate to="/login" replace />
  }

  if (isInitializing || isChecking) {
    return <div className="min-h-screen bg-[#FDFCE9]" />
  }

  // If user is on onboarding page
  if (location.pathname === '/onboarding') {
    // If they already have config, redirect to dashboard
    if (hasConfig === true) {
      return <Navigate to="/" replace />
    } else if (hasConfig === false) {
      // Otherwise let them complete onboarding
      return <>{children}</>
    } else {
      // Still checking, show loading
      return <div className="min-h-screen bg-[#FDFCE9]" />
    }
  }

  // If no OJT config, redirect to onboarding
  if (hasConfig === false) {
    return <Navigate to="/onboarding" replace />
  } else if (hasConfig === true) {
    // If OJT config exists, show children
    return <>{children}</>
  } else {
    // Still checking, show loading
    return <div className="min-h-screen bg-[#FDFCE9]" />
  }
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isInitializing } = useAuth()
  const [hasConfig, setHasConfig] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    if (user) {
      setIsChecking(true)
      setHasConfig(null)
      const checkConfig = async () => {
        const config = await hasOJTConfig(user.id)
        setHasConfig(config)
        setIsChecking(false)
      }
      checkConfig()
    } else {
      // Reset when user logs out to prevent infinite loading
      setIsChecking(false)
      setHasConfig(null)
    }
  }, [user])

  // Show login immediately if no user (don't wait for anything)
  if (!user && !isInitializing) {
    return <>{children}</>
  }

  if (isInitializing || isChecking) {
    return <div className="min-h-screen bg-[#FDFCE9]" />
  }

  // If user is logged in
  if (user) {
    // If no OJT config, go to onboarding
    if (hasConfig === false) {
      return <Navigate to="/onboarding" replace />
    } else if (hasConfig === true) {
      // Otherwise go to dashboard
      return <Navigate to="/" replace />
    } else {
      // Still checking, show loading
      return <div className="min-h-screen bg-[#FDFCE9]" />
    }
  } else {
    // If no user, show children
    return <>{children}</>
  }
}
