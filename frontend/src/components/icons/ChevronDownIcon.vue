<template>
  <svg :class="className" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
  </svg>
</template>

<script>
export default {
  name: 'ChevronDownIcon',
  props: {
    className: {
      type: String,
      default: 'w-4 h-4'
    }
  }
}
</script>