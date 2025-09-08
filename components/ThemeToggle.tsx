"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check localStorage first, then default to dark mode
    const savedTheme = localStorage.getItem('theme-preference');
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : true; // Default to dark mode
    
    setIsDark(shouldBeDark);
    
    // Apply the theme immediately
    const root = document.documentElement;
    if (shouldBeDark) {
      // Dark theme (default)
      root.removeAttribute('data-theme');
      root.style.setProperty('--bg', '#0f1115');
      root.style.setProperty('--fg', '#e9eef6');
      root.style.setProperty('--muted', '#1a1f29');
      root.style.setProperty('--line', 'rgba(255,255,255,0.08)');
      root.style.setProperty('--skeleton-a', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--skeleton-b', 'rgba(255,255,255,0.04)');
      root.style.setProperty('--skeleton-c', 'rgba(255,255,255,0.02)');
    } else {
      // Light theme
      root.setAttribute('data-theme', 'light');
      root.style.setProperty('--bg', '#faf9f7');
      root.style.setProperty('--fg', '#0f1115');
      root.style.setProperty('--muted', '#ffffff');
      root.style.setProperty('--line', 'rgba(0,0,0,0.08)');
      root.style.setProperty('--skeleton-a', 'rgba(0,0,0,0.06)');
      root.style.setProperty('--skeleton-b', 'rgba(0,0,0,0.04)');
      root.style.setProperty('--skeleton-c', 'rgba(0,0,0,0.02)');
    }
    
    // No need to listen for system theme changes since we default to dark mode
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    // Apply theme by setting CSS custom properties
    const root = document.documentElement;
    if (newIsDark) {
      // Dark theme (default)
      root.removeAttribute('data-theme');
      root.style.setProperty('--bg', '#0f1115');
      root.style.setProperty('--fg', '#e9eef6');
      root.style.setProperty('--muted', '#1a1f29');
      root.style.setProperty('--line', 'rgba(255,255,255,0.08)');
      root.style.setProperty('--skeleton-a', 'rgba(255,255,255,0.06)');
      root.style.setProperty('--skeleton-b', 'rgba(255,255,255,0.04)');
      root.style.setProperty('--skeleton-c', 'rgba(255,255,255,0.02)');
    } else {
      // Light theme
      root.setAttribute('data-theme', 'light');
      root.style.setProperty('--bg', '#faf9f7');
      root.style.setProperty('--fg', '#0f1115');
      root.style.setProperty('--muted', '#ffffff');
      root.style.setProperty('--line', 'rgba(0,0,0,0.08)');
      root.style.setProperty('--skeleton-a', 'rgba(0,0,0,0.06)');
      root.style.setProperty('--skeleton-b', 'rgba(0,0,0,0.04)');
      root.style.setProperty('--skeleton-c', 'rgba(0,0,0,0.02)');
    }
    
    // Save preference to localStorage
    localStorage.setItem('theme-preference', newIsDark ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="icon-btn"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        // Sun icon for light mode
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        // Moon icon for dark mode
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
