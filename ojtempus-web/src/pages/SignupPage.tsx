import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { GoogleIcon } from '../components/GoogleIcon'
import { LockIcon, MailIcon } from '../components/Icons'
import { supabase } from '../lib/supabase'
import { useSuccessWithTheme } from '../contexts/SuccessContext'

export function SignupPage() {
  const navigate = useNavigate()
  const { showSuccess } = useSuccessWithTheme('light')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setIsLoading(true)

    try {
      // First, check if user already exists by trying to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // If sign in succeeds, user exists - redirect to login
      if (signInData.user) {
        setError('An account with this email already exists. Please log in instead.')
        setIsLoading(false)
        return
      }

      // If sign in failed with invalid credentials, try to sign up
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('An account with this email already exists. Please log in instead.')
          } else {
            throw signUpError
          }
          return
        }

        if (signUpData.user) {
          // Check if email confirmation is required
          if (signUpData.session === null) {
            showSuccess('Account Created!', 'Check your email for the confirmation link.')
            navigate('/login')
          } else {
            // Auto-confirmed (if enabled in Supabase settings)
            showSuccess('Welcome!', 'Your account has been created successfully.')
            navigate('/onboarding')
          }
        }
      } else if (signInError) {
        throw signInError
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during authentication.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      })
      if (oauthError) throw oauthError
      // Note: User will be redirected by Supabase OAuth flow
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="text-left mb-8">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight lg:hidden mb-6 text-center">OJTempus</h1>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Create an account</h2>
        <p className="text-gray-500 text-sm font-medium">Enter your details below</p>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Email</label>
          <div className="relative group">
            <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#44ACFF] transition-colors" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              className="w-full pl-12 pr-5 py-4 rounded-full bg-gray-50 border-2 border-transparent hover:bg-gray-100 focus:bg-white focus:border-[#44ACFF] active:border-[#44ACFF] outline-none transition-all duration-200 text-sm text-gray-700 font-medium shadow-sm hover:shadow-md focus:shadow-lg active:shadow-lg"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Password</label>
          <div className="relative group">
            <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#44ACFF] transition-colors" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-4 rounded-full bg-gray-50 border-2 border-transparent hover:bg-gray-100 focus:bg-white focus:border-[#44ACFF] active:border-[#44ACFF] outline-none transition-all duration-200 text-sm text-gray-700 font-medium shadow-sm hover:shadow-md focus:shadow-lg active:shadow-lg"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#44ACFF] active:text-[#44ACFF] focus:outline-none transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
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
                >
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              ) : (
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
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg text-center">{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-4 bg-[#44ACFF] hover:bg-[#3A9BEF] active:bg-[#2E8BDF] text-white rounded-full font-bold text-sm transition-all duration-200 mt-2 disabled:opacity-70 shadow-md hover:shadow-lg active:shadow-xl active:scale-[0.98] hover:-translate-y-0.5"
        >
          {isLoading ? 'Processing...' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-8 mb-6 flex items-center">
        <div className="flex-1 border-t-2 border-gray-100" />
        <span className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Or</span>
        <div className="flex-1 border-t-2 border-gray-100" />
      </div>

      <button
        onClick={handleGoogleLogin}
        type="button"
        disabled={isLoading}
        className="w-full flex items-center justify-center py-4 px-4 bg-white border-2 border-[#89D4FF] hover:border-[#44ACFF] hover:bg-[#44ACFF]/5 active:bg-[#44ACFF]/10 rounded-full font-bold text-gray-700 hover:text-[#44ACFF] active:text-[#44ACFF] text-sm transition-all duration-200 shadow-sm hover:shadow-md active:shadow-lg active:scale-[0.98]"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-[#44ACFF] font-bold hover:text-[#3A9BEF] active:text-[#2E8BDF] transition-colors hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
