/* Layout Component - Global Layout with minimal header, empty canvas area, and minimal footer */
import { useState, useEffect, useRef } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const menuItems = [
    { label: 'Início', href: '/' },
    { label: 'Sobre', href: '/' },
    { label: 'Contato', href: '/' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF8] text-[#1A1A18] antialiased select-none">
      {/* Navigation Bar - 48px height */}
      <header className="h-12 w-full border-b border-[#E5E4E1] bg-transparent px-4 flex items-center justify-between relative z-20 shrink-0">
        <Link
          to="/"
          className="text-sm font-medium tracking-wide text-[#1A1A18] hover:opacity-80 transition-opacity"
        >
          Brand
        </Link>

        {/* Menu Icon Button */}
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label="Abrir menu"
            className="p-1.5 text-[#1A1A18] hover:opacity-70 transition-opacity focus:outline-none rounded"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg border border-[#E5E4E1] shadow-[0_4px_12px_rgba(0,0,0,0.06)] py-1.5 px-1 z-30 transition-all duration-150 animate-in fade-in slide-in-from-top-1"
            >
              <div className="flex flex-col gap-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="text-[13px] font-normal text-[#1A1A18] px-3.5 py-1.5 rounded transition-colors duration-120 hover:bg-[#F2F1EE]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area - Blank canvas flex-1 */}
      <main className="flex-1 flex flex-col w-full relative">
        <Outlet />
      </main>

      {/* Minimal Footer - 32px height */}
      <footer className="h-8 w-full border-t border-[#E5E4E1] bg-transparent px-4 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-normal text-[#A3A19B] tracking-tight">
          © 2024 — Todos os direitos reservados.
        </span>
      </footer>
    </div>
  )
}
