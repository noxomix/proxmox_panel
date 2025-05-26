<template>
  <button
    @click="handleCopy"
    class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
  >
    <CopyIcon className="w-4 h-4 mr-1" />
    {{ copied ? 'Copied!' : 'Copy' }}
  </button>
</template>

<script>
import { ref } from 'vue'
import CopyIcon from './icons/CopyIcon.vue'

export default {
  name: 'CopyButton',
  components: {
    CopyIcon
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