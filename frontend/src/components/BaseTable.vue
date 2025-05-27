<template>
  <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600" :style="{ minHeight }">
    <!-- Loading State -->
    <div v-if="loading" class="p-8 text-center">
      <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-gray-500 dark:text-gray-400">
        <SpinnerIcon class="animate-spin -ml-1 mr-3 h-5 w-5" />
        {{ loadingText }}
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-8 text-center">
      <div class="text-red-600 dark:text-red-400">
        <p class="font-medium">{{ errorTitle }}</p>
        <p class="text-sm mt-1">{{ error }}</p>
        <button
          @click="$emit('retry')"
          class="mt-4 px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="hasData" class="overflow-x-auto">
      <div :style="{ minHeight: tableBodyMinHeight }">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <!-- Table Header -->
          <thead class="bg-gray-100 dark:bg-gray-600">
            <slot name="header" />
          </thead>
          
          <!-- Table Body with zebra stripes -->
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <slot name="body" />
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="p-8 text-center">
      <slot name="empty" />
    </div>
  </div>
</template>

<script>
import SpinnerIcon from './icons/SpinnerIcon.vue';

export default {
  name: 'BaseTable',
  components: {
    SpinnerIcon
  },
  props: {
    data: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    loadingText: {
      type: String,
      default: 'Loading...'
    },
    errorTitle: {
      type: String,
      default: 'Failed to load data'
    },
    minHeight: {
      type: String,
      default: '200px'
    },
    tableBodyMinHeight: {
      type: String,
      default: '200px'
    }
  },
  emits: ['retry'],
  computed: {
    hasData() {
      return this.data.length > 0;
    }
  }
};
</script>