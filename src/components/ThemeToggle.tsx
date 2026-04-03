'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 border border-[var(--border)] hover:border-[var(--border-strong)] transition-all"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-[var(--foreground)]" />
      ) : (
        <Sun className="w-4 h-4 text-[var(--foreground)]" />
      )}
    </button>
  );
}
