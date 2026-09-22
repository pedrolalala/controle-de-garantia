/* 404 Page - Displays when a user attempts to access a non-existent route - translate to the language of the user */
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] text-[#1A1A18] font-sans">
      <div className="text-center">
        <h1 className="text-4xl font-light mb-2 tracking-tight">404</h1>
        <p className="text-sm text-[#A3A19B] mb-6">Página não encontrada</p>
        <a
          href="/"
          className="text-xs text-[#1A1A18] underline hover:opacity-70 transition-opacity"
        >
          Voltar para o início
        </a>
      </div>
    </div>
  )
}

export default NotFound
