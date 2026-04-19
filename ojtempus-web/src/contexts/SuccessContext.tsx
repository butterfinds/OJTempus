import React, { createContext, useContext, useState, useCallback } from 'react'
import { SuccessModal } from '../components/SuccessModal'

type Theme = 'light' | 'dark' | 'pinktasha'

interface SuccessModalState {
  isOpen: boolean
  title: string
  message: string
  theme: Theme
}

interface SuccessContextType {
  showSuccess: (title: string, message: string, theme?: Theme) => void
  hideSuccess: () => void
}

const SuccessContext = createContext<SuccessContextType | undefined>(undefined)

export function SuccessProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<SuccessModalState>({
    isOpen: false,
    title: '',
    message: '',
    theme: 'light',
  })

  const showSuccess = useCallback((title: string, message: string, theme: Theme = 'light') => {
    setModalState({
      isOpen: true,
      title,
      message,
      theme,
    })
  }, [])

  const hideSuccess = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return (
    <SuccessContext.Provider value={{ showSuccess, hideSuccess }}>
      {children}
      <SuccessModal
        isOpen={modalState.isOpen}
        onClose={hideSuccess}
        title={modalState.title}
        message={modalState.message}
        theme={modalState.theme}
      />
    </SuccessContext.Provider>
  )
}

export function useSuccess() {
  const context = useContext(SuccessContext)
  if (context === undefined) {
    throw new Error('useSuccess must be used within a SuccessProvider')
  }
  return context
}

// Wrapper hook that automatically applies the current theme
export function useSuccessWithTheme(currentTheme: Theme) {
  const { showSuccess, hideSuccess } = useSuccess()
  
  const showThemedSuccess = useCallback((title: string, message: string) => {
    showSuccess(title, message, currentTheme)
  }, [showSuccess, currentTheme])
  
  return { showSuccess: showThemedSuccess, hideSuccess }
}
