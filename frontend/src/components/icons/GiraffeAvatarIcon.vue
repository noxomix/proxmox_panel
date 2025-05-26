<template>
  <svg 
    viewBox="0 0 32 32" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    class="w-full h-full"
  >
    <!-- Jungle background -->
    <circle cx="16" cy="16" r="16" :fill="backgroundColor"/>
    
    <!-- Background jungle leaves -->
    <ellipse cx="8" cy="10" rx="3" ry="6" :fill="leafColor" opacity="0.6"/>
    <ellipse cx="24" cy="12" rx="2.5" ry="5" :fill="leafColor" opacity="0.7"/>
    <ellipse cx="6" cy="20" rx="2" ry="4" :fill="darkLeafColor" opacity="0.5"/>
    <ellipse cx="26" cy="22" rx="2.5" ry="5" :fill="darkLeafColor" opacity="0.6"/>
    
    <!-- Gorilla body (minimal) -->
    <ellipse cx="16" cy="24" rx="6" ry="5" :fill="gorillaColor"/>
    
    <!-- Gorilla chest -->
    <ellipse cx="16" cy="22" rx="4" ry="4" :fill="chestColor"/>
    
    <!-- Gorilla arms -->
    <ellipse cx="10" cy="20" rx="2.5" ry="6" :fill="gorillaColor"/>
    <ellipse cx="22" cy="20" rx="2.5" ry="6" :fill="gorillaColor"/>
    
    <!-- Gorilla head -->
    <ellipse cx="16" cy="14" rx="5" ry="6" :fill="gorillaColor"/>
    
    <!-- Gorilla face area -->
    <ellipse cx="16" cy="15" rx="3.5" ry="4" :fill="faceColor"/>
    
    <!-- Simple nose shape -->
    <ellipse cx="16" cy="16" rx="0.8" ry="1.2" :fill="gorillaColor"/>
    
    <!-- Foreground jungle leaves -->
    <ellipse cx="4" cy="25" rx="2" ry="4" :fill="leafColor" opacity="0.8"/>
    <ellipse cx="28" cy="28" rx="2.5" ry="4" :fill="darkLeafColor" opacity="0.7"/>
  </svg>
</template>

<script>
export default {
  name: 'GorillaAvatarIcon',
  props: {
    variant: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'blue', 'purple', 'green', 'orange'].includes(value)
    }
  },
  computed: {
    backgroundColor() {
      const variants = {
        default: '#16A34A', // green-600 - jungle green
        blue: '#0EA5E9',    // sky-500
        purple: '#8B5CF6',  // violet-500
        green: '#059669',   // emerald-600
        orange: '#EA580C'   // orange-600
      }
      return variants[this.variant]
    },
    leafColor() {
      return '#22C55E' // green-500 - bright jungle leaves
    },
    darkLeafColor() {
      return '#15803D' // green-700 - darker jungle leaves
    },
    gorillaColor() {
      return '#374151' // gray-700 - dark gorilla fur
    },
    chestColor() {
      return '#6B7280' // gray-500 - lighter chest
    },
    faceColor() {
      return '#9CA3AF' // gray-400 - gorilla face
    }
  }
}
</script>