'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';

const SunIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
    />
  </svg>
);

const SystemIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
    />
  </svg>
);

interface ThemeToggleProps {
  variant?: 'simple' | 'dropdown';
  className?: string;
}

export function ThemeToggle({ variant = 'simple', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-lg bg-gray-200 animate-pulse ${className}`} />
    );
  }

  if (variant === 'simple') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          inline-flex items-center justify-center
          w-9 h-9 rounded-lg
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          transition-colors
          ${className}
        `}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
      >
        {resolvedTheme === 'light' ? (
          <MoonIcon className="w-4 h-4" />
        ) : (
          <SunIcon className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center justify-center
          w-9 h-9 rounded-lg
          bg-white dark:bg-gray-800
          border border-gray-300 dark:border-gray-600
          hover:bg-gray-50 dark:hover:bg-gray-700
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          transition-colors
          ${className}
        `}
        aria-label="Theme selector"
        aria-expanded={isOpen}
      >
        {theme === 'light' && <SunIcon className="w-4 h-4" />}
        {theme === 'dark' && <MoonIcon className="w-4 h-4" />}
        {theme === 'system' && <SystemIcon className="w-4 h-4" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            <button
              onClick={() => {
                setTheme('light');
                setIsOpen(false);
              }}
              className={`
                w-full px-3 py-2 text-left text-sm
                hover:bg-gray-50 dark:hover:bg-gray-700
                flex items-center gap-2
                ${theme === 'light' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}
              `}
            >
              <SunIcon className="w-4 h-4" />
              Light
            </button>
            <button
              onClick={() => {
                setTheme('dark');
                setIsOpen(false);
              }}
              className={`
                w-full px-3 py-2 text-left text-sm
                hover:bg-gray-50 dark:hover:bg-gray-700
                flex items-center gap-2
                ${theme === 'dark' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}
              `}
            >
              <MoonIcon className="w-4 h-4" />
              Dark
            </button>
            <button
              onClick={() => {
                setTheme('system');
                setIsOpen(false);
              }}
              className={`
                w-full px-3 py-2 text-left text-sm
                hover:bg-gray-50 dark:hover:bg-gray-700
                flex items-center gap-2
                ${theme === 'system' ? 'text-primary-600 bg-primary-50 dark:bg-primary-900 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}
              `}
            >
              <SystemIcon className="w-4 h-4" />
              System
            </button>
          </div>
        </>
      )}
    </div>
  );
}