<template>
  <svg :class="className" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11.917 9.724 16.5 19 7.5"/>
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