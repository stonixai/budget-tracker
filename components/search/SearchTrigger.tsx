'use client';

import { useState, useEffect } from 'react';
import GlobalSearch from './GlobalSearch';

interface SearchTriggerProps {
  className?: string;
}

export default function SearchTrigger({ className = '' }: SearchTriggerProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut to open search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsSearchOpen(true)}
        className={`flex items-center gap-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors ${className}`}
      >
        <SearchIcon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">Search everything...</span>
        <div className="hidden sm:flex items-center gap-1">
          <kbd className="px-2 py-1 text-xs text-gray-500 bg-white border border-gray-200 rounded">
            {typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'}
          </kbd>
          <kbd className="px-2 py-1 text-xs text-gray-500 bg-white border border-gray-200 rounded">K</kbd>
        </div>
      </button>

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}

const SearchIcon = ({ className = "" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);