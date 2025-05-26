import { ref, watch } from 'vue'

// Global dark mode state - default to false (light mode)
export const isDark = ref(false)

// Initialize dark mode - always default to light mode unless explicitly set to dark
export function initDarkMode() {
  const savedTheme = localStorage.getItem('theme')
  
  // Only use dark mode if explicitly saved as 'dark'
  // Ignore system preference - always default to light
  isDark.value = savedTheme === 'dark'
  
  updateTheme()
}

// Update the theme classes and localStorage
export function updateTheme() {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

// Toggle dark mode
export function toggleDarkMode() {
  isDark.value = !isDark.value
  updateTheme()
}

// Watch for changes and update theme
watch(isDark, updateTheme)