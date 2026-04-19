import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'pinktasha'

interface SkeletonProps {
  className?: string
  theme?: Theme
}

export function Skeleton({ className = '', theme = 'light' }: SkeletonProps) {
  const baseClasses = theme === 'dark' 
    ? 'bg-gray-700' 
    : 'bg-gray-200'
  
  return (
    <div 
      className={`animate-pulse rounded-lg ${baseClasses} ${className}`}
    />
  )
}

export function SkeletonText({ 
  lines = 1, 
  width = 'full', 
  theme = 'light',
  className = ''
}: { 
  lines?: number
  width?: string | string[]
  theme?: Theme
  className?: string
}) {
  const getWidth = (index: number) => {
    if (Array.isArray(width)) {
      return width[index % width.length]
    }
    return width
  }
  
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i}
          className={`h-4 w-${getWidth(i)}`}
          theme={theme}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ theme = 'light', className = '' }: SkeletonProps) {
  return (
    <div className={`p-6 rounded-[24px] ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm ${className}`}>
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" theme={theme} />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-1/3" theme={theme} />
          <Skeleton className="h-4 w-1/2" theme={theme} />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100/10">
        <Skeleton className="h-8 w-3/4" theme={theme} />
      </div>
    </div>
  )
}

export function SkeletonStats({ theme = 'light' }: { theme?: Theme }) {
  return (
    <div className={`rounded-[32px] p-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-16 h-16 rounded-2xl" theme={theme} />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-2" theme={theme} />
          <Skeleton className="h-8 w-16" theme={theme} />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full mb-4" theme={theme} />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" theme={theme} />
        <Skeleton className="h-4 w-16" theme={theme} />
      </div>
    </div>
  )
}

export function SkeletonProgress({ theme = 'light' }: { theme?: Theme }) {
  return (
    <div className={`rounded-[32px] p-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" theme={theme} />
        <Skeleton className="h-8 w-20 rounded-full" theme={theme} />
      </div>
      <Skeleton className="h-4 w-full rounded-full mb-4" theme={theme} />
      <div className="flex justify-between mt-4">
        <Skeleton className="h-4 w-24" theme={theme} />
        <Skeleton className="h-4 w-24" theme={theme} />
      </div>
    </div>
  )
}

export function SkeletonQuote({ theme = 'light' }: { theme?: Theme }) {
  return (
    <div className={`rounded-[24px] p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-4 h-4 rounded" theme={theme} />
        <Skeleton className="h-4 w-16" theme={theme} />
      </div>
      <Skeleton className="h-16 w-full" theme={theme} />
    </div>
  )
}

export function SkeletonScheduleItem({ theme = 'light' }: { theme?: Theme }) {
  return (
    <div className={`rounded-[20px] p-5 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="w-10 h-8" theme={theme} />
          <Skeleton className="w-8 h-4" theme={theme} />
        </div>
        <div className="flex-1 min-w-0">
          <Skeleton className="h-5 w-3/4 mb-2" theme={theme} />
          <Skeleton className="h-4 w-1/2 mb-3" theme={theme} />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" theme={theme} />
            <Skeleton className="h-6 w-20 rounded-full" theme={theme} />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" theme={theme} />
      </div>
    </div>
  )
}

export function SkeletonEditLog({ theme = 'light' }: { theme?: Theme }) {
  return (
    <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="w-16 h-5 rounded-full" theme={theme} />
        <Skeleton className="h-4 w-24" theme={theme} />
      </div>
      <Skeleton className="h-4 w-full mb-2" theme={theme} />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" theme={theme} />
        <Skeleton className="h-4 w-20" theme={theme} />
      </div>
    </div>
  )
}

export function DashboardSkeleton({ theme = 'light' }: { theme?: Theme }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FDFCE9]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#43A6FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your OJT data...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`flex h-screen font-sans antialiased overflow-hidden transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gray-900 text-white' 
        : theme === 'pinktasha'
        ? 'bg-[#FFF9E6] text-gray-900'
        : 'bg-[#FDFCE9] text-gray-900'
    }`}>
      {/* Sidebar Skeleton */}
      <nav className={`w-64 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col py-6 z-10 relative transition-colors duration-300 ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="px-6 mb-8">
          <Skeleton className="h-8 w-32" theme={theme} />
        </div>
        <div className="flex-1 px-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" theme={theme} />
          ))}
        </div>
        <div className="px-4 mt-auto space-y-2">
          <Skeleton className="h-12 w-full rounded-xl" theme={theme} />
          <Skeleton className="h-12 w-full rounded-xl" theme={theme} />
        </div>
      </nav>
      
      {/* Main Content Skeleton */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className={`px-10 py-6 border-b flex items-center justify-between ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-100'
        }`}>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-48" theme={theme} />
            <Skeleton className="h-6 w-24 rounded-full" theme={theme} />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" theme={theme} />
            <Skeleton className="h-10 w-10 rounded-full" theme={theme} />
          </div>
        </header>
        
        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <SkeletonStats theme={theme} />
            <SkeletonProgress theme={theme} />
            <SkeletonQuote theme={theme} />
          </div>
          
          {/* Time Tracking Section */}
          <div className={`rounded-[32px] p-8 mb-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-2xl" theme={theme} />
                <div>
                  <Skeleton className="h-6 w-32 mb-2" theme={theme} />
                  <Skeleton className="h-4 w-24" theme={theme} />
                </div>
              </div>
              <Skeleton className="h-12 w-32 rounded-full" theme={theme} />
            </div>
            <div className="grid grid-cols-3 gap-6">
              <Skeleton className="h-24 rounded-2xl" theme={theme} />
              <Skeleton className="h-24 rounded-2xl" theme={theme} />
              <Skeleton className="h-24 rounded-2xl" theme={theme} />
            </div>
          </div>
          
          {/* Bottom Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} theme={theme} />
              ))}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-[24px]" theme={theme} />
              <Skeleton className="h-32 rounded-[24px]" theme={theme} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export function ScheduleSkeleton({ theme = 'light' }: { theme?: Theme }) {
  return (
    <div className="w-full px-10 py-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <Skeleton className="h-10 w-48 mb-2" theme={theme} />
          <Skeleton className="h-4 w-64" theme={theme} />
        </div>
        <Skeleton className="h-12 w-36 rounded-full" theme={theme} />
      </div>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Schedules */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`rounded-[24px] p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" theme={theme} />
                <Skeleton className="h-6 w-32" theme={theme} />
              </div>
              <Skeleton className="h-6 w-8 rounded-full" theme={theme} />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonScheduleItem key={i} theme={theme} />
              ))}
            </div>
          </div>
          
          <div className={`rounded-[24px] p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" theme={theme} />
                <Skeleton className="h-6 w-40" theme={theme} />
              </div>
              <Skeleton className="h-6 w-8 rounded-full" theme={theme} />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <SkeletonScheduleItem key={i} theme={theme} />
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column - Edit History */}
        <div className={`rounded-[24px] p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm h-fit`}>
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" theme={theme} />
            <Skeleton className="h-6 w-28" theme={theme} />
          </div>
          <Skeleton className="h-4 w-full mb-6" theme={theme} />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonEditLog key={i} theme={theme} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Skeleton className="h-16 rounded-xl" theme={theme} />
            <Skeleton className="h-16 rounded-xl" theme={theme} />
          </div>
        </div>
      </div>
    </div>
  )
}
