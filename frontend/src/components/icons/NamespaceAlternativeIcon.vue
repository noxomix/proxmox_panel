<template>
  <svg
    :class="className"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Container outline -->
    <rect x="2" y="2" width="20" height="20" rx="2" stroke-width="1.5" />

    <!-- Top row of namespaces -->
    <rect x="4" y="4" width="3" height="3" rx="0.3" stroke-width="1" />
    <rect x="8" y="4" width="4" height="3" rx="0.3" stroke-width="1" />
    <rect x="13" y="4" width="3" height="3" rx="0.3" stroke-width="1" />
    <rect x="17" y="4" width="3" height="3" rx="0.3" stroke-width="1" />

    <!-- Second row -->
    <rect x="4" y="8" width="4" height="2.5" rx="0.3" stroke-width="1" />
    <rect x="9" y="8" width="2.5" height="2.5" rx="0.3" stroke-width="1" />
    <rect x="12.5" y="8" width="3.5" height="2.5" rx="0.3" stroke-width="1" />
    <rect x="17" y="8" width="3" height="2.5" rx="0.3" stroke-width="1" />

    <!-- Third row -->
    <rect x="4" y="11.5" width="2.5" height="3" rx="0.3" stroke-width="1" />
    <rect x="7.5" y="11.5" width="3" height="3" rx="0.3" stroke-width="1" />
    <rect x="11.5" y="11.5" width="4" height="3" rx="0.3" stroke-width="1" />
    <rect x="16.5" y="11.5" width="3.5" height="3" rx="0.3" stroke-width="1" />

    <!-- Fourth row -->
    <rect x="4" y="15.5" width="3.5" height="2.5" rx="0.3" stroke-width="1" />
    <rect x="8.5" y="15.5" width="2.5" height="2.5" rx="0.3" stroke-width="1" />
    <rect x="12" y="15.5" width="4" height="2.5" rx="0.3" stroke-width="1" />
    <rect x="17" y="15.5" width="3" height="2.5" rx="0.3" stroke-width="1" />

    <!-- Bottom row -->
    <rect x="4" y="19" width="4" height="1.5" rx="0.3" stroke-width="1" />
    <rect x="9" y="19" width="3" height="1.5" rx="0.3" stroke-width="1" />
    <rect x="13" y="19" width="3.5" height="1.5" rx="0.3" stroke-width="1" />
    <rect x="17.5" y="19" width="2.5" height="1.5" rx="0.3" stroke-width="1" />
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