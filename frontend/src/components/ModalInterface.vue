<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
        <!-- Backdrop -->
        <div 
          class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          @click="handleBackdropClick"
        ></div>
        
        <!-- Modal Container -->
        <div class="flex min-h-full items-center justify-center p-4 py-8">
          <Transition
            enter-active-class="duration-300 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="duration-200 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-4"
          >
            <div
              v-if="show"
              :class="[
                'relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transform transition-all',
                'border border-gray-200/50 dark:border-gray-700/50',
                'max-h-[85vh] flex flex-col',
                sizeClasses
              ]"
              @click.stop
            >
              <!-- Header -->
              <div v-if="$slots.header || title" class="px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
                <div class="flex items-center justify-between">
                  <div>
                    <slot name="header">
                      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                        {{ title }}
                      </h2>
                      <p v-if="subtitle" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {{ subtitle }}
                      </p>
                    </slot>
                  </div>
                  
                  <button
                    v-if="showCloseButton"
                    @click="handleClose"
                    class="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Content -->
              <div class="px-6 py-6 flex-1 overflow-y-auto">
                <slot></slot>
              </div>

              <!-- Footer -->
              <div v-if="$slots.footer" class="px-6 py-4 bg-gray-50/50 dark:bg-gray-700/30 border-t border-gray-200/50 dark:border-gray-700/50 rounded-b-2xl flex-shrink-0">
                <slot name="footer"></slot>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'ModalInterface',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(value)
    },
    showCloseButton: {
      type: Boolean,
      default: true
    },
    closeOnBackdrop: {
      type: Boolean,
      default: true
    },
    closeOnEscape: {
      type: Boolean,
      default: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const sizeClasses = computed(() => {
      const sizes = {
        xs: 'max-w-xs w-full',
        sm: 'max-w-sm w-full',
        md: 'max-w-md w-full',
        lg: 'max-w-lg w-full',
        xl: 'max-w-xl w-full',
        '2xl': 'max-w-2xl w-full'
      };
      return sizes[props.size];
    });

    const handleClose = () => {
      emit('close');
    };

    const handleBackdropClick = () => {
      if (props.closeOnBackdrop) {
        handleClose();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && props.closeOnEscape && props.show) {
        handleClose();
      }
    };

    onMounted(() => {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      if (props.show) {
        document.body.style.overflow = 'hidden';
      }
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    });

    // Watch for show prop changes to handle body scroll
    const handleBodyScroll = () => {
      if (props.show) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };

    return {
      sizeClasses,
      handleClose,
      handleBackdropClick,
      handleBodyScroll
    };
  },
  watch: {
    show: {
      handler: 'handleBodyScroll',
      immediate: true
    }
  }
};
</script>