<template>
  <svg 
    :class="className" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Back layer -->
    <rect 
      x="2" 
      y="2" 
      width="10" 
      height="10" 
      rx="1" 
      stroke-width="1.5"
      opacity="0.4"
    />
    <!-- Second layer -->
    <rect 
      x="4" 
      y="4" 
      width="10" 
      height="10" 
      rx="1" 
      stroke-width="1.5"
      opacity="0.6"
    />
    <!-- Third layer -->
    <rect 
      x="6" 
      y="6" 
      width="10" 
      height="10" 
      rx="1" 
      stroke-width="1.5"
      opacity="0.8"
    />
    <!-- Front layer -->
    <rect 
      x="8" 
      y="8" 
      width="10" 
      height="10" 
      rx="1" 
      stroke-width="2"
    />
  </svg>
</template>

<script setup>
defineProps({
  className: {
    type: String,
    default: 'w-6 h-6'
  }
});
</script>