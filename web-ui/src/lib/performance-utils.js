// Performance utility functions for React components

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed since last call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function - ensures function is called at most once per interval
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between calls
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * RequestAnimationFrame throttle - ensures smooth 60fps updates
 * @param {Function} func - Function to throttle
 * @returns {Function} RAF-throttled function
 */
export function rafThrottle(func) {
  let rafId = null
  return function(...args) {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      func.apply(this, args)
      rafId = null
    })
  }
}