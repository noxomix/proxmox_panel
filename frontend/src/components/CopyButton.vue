<template>
  <RippleEffect color="rgba(37, 99, 235, 0.3)" v-slot="{ createRipple }">
    <button
      @click="(e) => { createRipple(e); handleCopy(); }"
      @touchstart="createRipple"
      class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-brand-700 bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/30 transition-colors"
    >
      <CopyIcon className="w-4 h-4 mr-1" />
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
  </RippleEffect>
</template>

<script>
import { ref } from 'vue'
import CopyIcon from './icons/CopyIcon.vue'
import RippleEffect from './RippleEffect.vue'

export default {
  name: 'CopyButton',
  components: {
    CopyIcon,
    RippleEffect
  },
  props: {
    text: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const copied = ref(false)

    const handleCopy = async () => {
      if (props.text) {
        try {
          await navigator.clipboard.writeText(props.text)
          copied.value = true
          setTimeout(() => {
            copied.value = false
          }, 2000)
        } catch (error) {
          console.error('Failed to copy text:', error)
        }
      }
    }

    return {
      copied,
      handleCopy
    }
  }
}
</script>