<template>
  <div 
    :class="[
      'rounded-full bg-center bg-no-repeat border-2 border-gray-200 dark:border-gray-600 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110',
      sizeClasses
    ]"
    :title="alt"
  >
    <div 
      class="w-full h-full bg-contain bg-center bg-no-repeat transition-transform duration-300 hover:scale-110"
      :style="{ backgroundImage: `url(${imageUrl})` }"
    ></div>
  </div>
</template>

<script>
export default {
  name: 'Avatar',
  props: {
    imageUrl: {
      type: String,
      required: true
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['sm', 'md', 'md-lg', 'lg', 'xl'].includes(value)
    },
    alt: {
      type: String,
      default: 'Avatar'
    }
  },
  computed: {
    sizeClasses() {
      const sizes = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        'md-lg': 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
      };
      return sizes[this.size] || sizes.md;
    }
  }
};
</script>