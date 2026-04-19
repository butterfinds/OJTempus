import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email?: string
}

interface AuthContextValue {
  user: AuthUser | null
  isInitializing: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Add timeout to prevent hanging for minutes
    const timeoutId = setTimeout(() => {
      if (isMounted && isInitializing) {
        setIsInitializing(false)
      }
    }, 5000) // 5 second timeout

    supabase.auth.getSession().then(({ data }) => {
      clearTimeout(timeoutId)
      if (!isMounted) return
      const sessionUser = data.session?.user
      setUser(sessionUser ? ({ id: sessionUser.id, email: sessionUser.email ?? undefined } satisfies AuthUser) : null)
      setIsInitializing(false)
    }).catch(() => {
      clearTimeout(timeoutId)
      if (!isMounted) return
      setIsInitializing(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      const sessionUser = session?.user
      setUser(sessionUser ? ({ id: sessionUser.id, email: sessionUser.email ?? undefined } satisfies AuthUser) : null)
      setIsInitializing(false)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [user, isInitializing],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
