import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      toggle: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
    }),
    {
      name: 'wallet:theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = theme
}

/** Llamar una vez al boot para evitar el flash inicial. */
export function bootstrapTheme(): void {
  const stored = localStorage.getItem('wallet:theme')
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { state?: { theme?: Theme } }
      if (parsed.state?.theme) {
        applyTheme(parsed.state.theme)
        return
      }
    } catch {
      // ignore
    }
  }
  applyTheme('dark')
}
