import { useEffect, useState, useCallback } from 'react'
import { CheckIcon, XIcon } from './Icons'

type Theme = 'light' | 'dark' | 'pinktasha'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  theme?: Theme
}

export function SuccessModal({ isOpen, onClose, title, message, theme = 'light' }: SuccessModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleClose = useCallback(() => {
    setIsEntering(false)
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsExiting(false)
      onClose()
    }, 300)
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      // Show immediately - no delay
      setIsVisible(true)
      // Small delay to trigger enter animation
      requestAnimationFrame(() => {
        setIsEntering(true)
      })
      
      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, handleClose])

  if (!isVisible) return null

  const themeStyles = {
    light: {
      container: 'bg-white border border-green-400',
      title: 'text-gray-900',
      message: 'text-gray-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      closeBtn: 'hover:bg-green-50 text-gray-400 hover:text-green-600',
      progressBar: 'bg-green-500',
      shadow: 'shadow-[0_8px_32px_rgba(34,197,94,0.25)]',
      glow: 'ring-2 ring-green-400/50',
    },
    dark: {
      container: 'bg-gray-800 border border-green-500',
      title: 'text-white',
      message: 'text-gray-400',
      iconBg: 'bg-green-900/30',
      iconColor: 'text-green-400',
      closeBtn: 'hover:bg-gray-700 text-gray-500 hover:text-green-400',
      progressBar: 'bg-green-400',
      shadow: 'shadow-[0_8px_32px_rgba(74,222,128,0.3)]',
      glow: 'ring-2 ring-green-500/50',
    },
    pinktasha: {
      container: 'bg-white border border-[#F13E93]',
      title: 'text-gray-900',
      message: 'text-gray-600',
      iconBg: 'bg-pink-100',
      iconColor: 'text-[#F13E93]',
      closeBtn: 'hover:bg-pink-50 text-gray-400 hover:text-[#F13E93]',
      progressBar: 'bg-[#F13E93]',
      shadow: 'shadow-[0_8px_32px_rgba(241,62,147,0.25)]',
      glow: 'ring-2 ring-[#F13E93]/50',
    },
  }

  const styles = themeStyles[theme]

  // Smooth slide in from right with scale
  const getTransformStyle = () => {
    if (isExiting) {
      return 'translate-x-[100%] translate-y-2 scale-95 opacity-0'
    }
    if (isEntering) {
      return 'translate-x-0 translate-y-0 scale-100 opacity-100'
    }
    return 'translate-x-[100%] translate-y-4 scale-90 opacity-0'
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
      <div 
        className={`relative pointer-events-auto min-w-[320px] max-w-[380px] rounded-xl overflow-hidden transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${getTransformStyle()} ${styles.container} ${styles.shadow} ${styles.glow}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${styles.closeBtn}`}
        >
          <XIcon className="w-4 h-4" />
        </button>

        <div className="p-4 pr-10 flex items-start gap-3">
          {/* Success Icon - compact */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}>
            <CheckIcon className={`w-5 h-5 ${styles.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={`text-sm font-bold mb-0.5 ${styles.title}`}>
              {title}
            </h3>

            {/* Message */}
            <p className={`text-xs leading-relaxed ${styles.message}`}>
              {message}
            </p>
          </div>
        </div>

        {/* Progress bar for auto-close - at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200/30">
          <div 
            className={`h-full ${styles.progressBar} transition-all ease-linear`}
            style={{ 
              width: isEntering ? '0%' : '100%',
              transition: isEntering ? 'width 3000ms linear' : 'none'
            }}
          />
        </div>
      </div>
    </div>
  )
}
