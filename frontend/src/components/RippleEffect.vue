<template>
  <div 
    ref="rippleContainer" 
    class="ripple-container" 
    @click="createRipple"
    @touchstart="createRipple"
  >
    <slot />
  </div>
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
    const rippleContainer = ref(null)
    const activeRipples = new Set()

    const createRipple = (event) => {
      // Don't create ripple if disabled or if it's a touch event and we already handled click
      if (props.disabled) return
      
      // Prevent double ripples on devices that support both touch and mouse
      if (event.type === 'touchstart') {
        event.preventDefault()
      }

      const container = rippleContainer.value
      if (!container) return

      // Get container bounds
      const rect = container.getBoundingClientRect()
      
      // Calculate ripple position relative to container
      let x, y
      if (event.type === 'touchstart' && event.touches && event.touches[0]) {
        x = event.touches[0].clientX - rect.left
        y = event.touches[0].clientY - rect.top
      } else {
        x = event.clientX - rect.left
        y = event.clientY - rect.top
      }

      // Calculate ripple size (diagonal of container for full coverage)
      const size = Math.sqrt(rect.width * rect.width + rect.height * rect.height) * 2

      // Create ripple element
      const ripple = document.createElement('div')
      ripple.className = 'ripple-wave'
      
      // Get the computed border-radius of the container
      const computedStyle = window.getComputedStyle(container)
      const borderRadius = computedStyle.borderRadius || '0px'
      
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
        z-index: 1000;
        animation: ripple-animation ${props.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
      `

      // Add to active ripples set for cleanup
      activeRipples.add(ripple)

      // Add ripple to container
      container.appendChild(ripple)

      // Remove ripple after animation
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple)
        }
        activeRipples.delete(ripple)
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
          
          .ripple-container {
            position: relative;
            overflow: hidden;
            isolation: isolate;
            display: inline-block;
          }
          
          .ripple-container > * {
            position: relative;
            z-index: 1;
            display: block;
          }
          
          .ripple-wave {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
          }
        `
        document.head.appendChild(style)
      }
      
      // Copy border-radius from the button to the container
      const container = rippleContainer.value
      if (container) {
        const firstChild = container.children[0]
        if (firstChild) {
          const computedStyle = window.getComputedStyle(firstChild)
          const borderRadius = computedStyle.borderRadius
          if (borderRadius && borderRadius !== '0px') {
            container.style.borderRadius = borderRadius
          }
        }
      }
    })

    onUnmounted(() => {
      cleanup()
    })

    return {
      rippleContainer,
      createRipple
    }
  }
}
</script>

<style scoped>
.ripple-container {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  display: inline-block;
}

.ripple-container > :deep(*) {
  position: relative;
  z-index: 1;
  display: block;
}
</style>