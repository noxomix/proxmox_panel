<template>
  <svg :class="className" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
</template>

<script>
export default {
  name: 'CheckIcon',
  props: {
    className: {
      type: String,
      default: 'w-6 h-6'
    }
  }
}
</script>