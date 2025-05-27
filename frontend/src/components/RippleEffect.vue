<template>
  <slot :createRipple="createRipple" />
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'

export default {
  name: 'RippleEffect',
  props: {
    color: {
      type: String,
      default: 'rgba(255, 255, 255, 0.3)'
    },
    duration: {
      type: Number,
      default: 600
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const activeRipples = new Set()

    const createRipple = (event) => {
      // Don't create ripple if disabled
      if (props.disabled) return
      
      // Prevent double ripples on devices that support both touch and mouse
      if (event.type === 'touchstart') {
        event.preventDefault()
      }

      const target = event.currentTarget
      if (!target) return

      // Ensure the target has proper positioning and overflow
      const originalPosition = target.style.position
      const originalOverflow = target.style.overflow
      
      if (getComputedStyle(target).position === 'static') {
        target.style.position = 'relative'
      }
      target.style.overflow = 'hidden'

      // Get target bounds
      const rect = target.getBoundingClientRect()
      
      // Calculate ripple position relative to target
      let x, y
      if (event.type === 'touchstart' && event.touches && event.touches[0]) {
        x = event.touches[0].clientX - rect.left
        y = event.touches[0].clientY - rect.top
      } else {
        x = event.clientX - rect.left
        y = event.clientY - rect.top
      }

      // Calculate ripple size based on button size for proper containment
      const size = Math.max(rect.width, rect.height) * 2

      // Create ripple element
      const ripple = document.createElement('div')
      ripple.className = 'ripple-wave'
      
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background-color: ${props.color};
        width: ${size}px;
        height: ${size}px;
        left: ${x - size / 2}px;
        top: ${y - size / 2}px;
        pointer-events: none;
        transform: scale(0);
        opacity: 1;
        z-index: 0;
        animation: ripple-animation ${props.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
      `

      // Add to active ripples set for cleanup
      activeRipples.add(ripple)

      // Add ripple to target
      target.appendChild(ripple)

      // Remove ripple after animation and restore styles
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple)
        }
        activeRipples.delete(ripple)
        
        // Restore original styles if no more ripples
        if (activeRipples.size === 0) {
          if (originalPosition) {
            target.style.position = originalPosition
          } else if (target.style.position === 'relative') {
            target.style.position = ''
          }
          
          if (originalOverflow) {
            target.style.overflow = originalOverflow
          } else {
            target.style.overflow = ''
          }
        }
      }, props.duration)
    }

    const cleanup = () => {
      // Clean up any remaining ripples
      activeRipples.forEach(ripple => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple)
        }
      })
      activeRipples.clear()
    }

    onMounted(() => {
      // Add CSS animation keyframes if not already added
      if (!document.querySelector('#ripple-styles')) {
        const style = document.createElement('style')
        style.id = 'ripple-styles'
        style.textContent = `
          @keyframes ripple-animation {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 0;
            }
          }
        `
        document.head.appendChild(style)
      }
    })

    onUnmounted(() => {
      cleanup()
    })

    return {
      createRipple
    }
  }
}
</script>

