<template>
  <div class="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden" :style="{ minHeight }">
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
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <!-- Table Header -->
        <thead class="bg-gray-200 dark:bg-gray-700">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[
                column.headerClass || 'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider',
                column.sortable ? 'cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600' : ''
              ]"
              @click="column.sortable ? $emit('sort', column.key) : null"
            >
              <div v-if="column.sortable" class="flex items-center space-x-1">
                <span>{{ column.label }}</span>
                <ChevronDownIcon 
                  v-if="sortField === column.key" 
                  :class="{ 'transform rotate-180': sortOrder === 'asc' }"
                  class="w-4 h-4 transition-transform duration-200"
                />
              </div>
              <span v-else>{{ column.label }}</span>
            </th>
          </tr>
        </thead>
        
        <!-- Table Body with min height -->
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="(item, index) in data"
            :key="getRowKey(item, index)"
            class="even:bg-gray-50 even:dark:bg-gray-700 odd:bg-white odd:dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <slot name="row" :item="item" :index="index" />
          </tr>
          <!-- Spacer rows to maintain minimum height -->
          <tr
            v-for="n in spacerRows"
            :key="`spacer-${n}`"
            class="even:bg-gray-50 even:dark:bg-gray-700 odd:bg-white odd:dark:bg-gray-800"
            style="height: 64px;"
          >
            <td v-for="column in columns" :key="column.key" class="px-6 py-4">&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="p-8 text-center">
      <component :is="emptyIcon" :className="'mx-auto h-12 w-12 text-gray-400 dark:text-gray-500'" />
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">{{ emptyTitle }}</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {{ emptyMessage }}
      </p>
      <slot name="empty-actions" />
    </div>
  </div>
</template>

<script>
import SpinnerIcon from './icons/SpinnerIcon.vue';
import ChevronDownIcon from './icons/ChevronDownIcon.vue';

export default {
  name: 'DataTable',
  components: {
    SpinnerIcon,
    ChevronDownIcon
  },
  props: {
    data: {
      type: Array,
      required: true
    },
    columns: {
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
    emptyTitle: {
      type: String,
      default: 'No data found'
    },
    emptyMessage: {
      type: String,
      default: 'No items to display.'
    },
    emptyIcon: {
      type: [String, Object],
      default: 'div'
    },
    rowKey: {
      type: [String, Function],
      default: 'id'
    },
    minHeight: {
      type: String,
      default: '400px'
    },
    minRows: {
      type: Number,
      default: 8
    },
    sortField: {
      type: String,
      default: null
    },
    sortOrder: {
      type: String,
      default: 'desc'
    }
  },
  emits: ['retry'],
  computed: {
    hasData() {
      return this.data.length > 0;
    },
    spacerRows() {
      // Calculate how many empty rows we need to reach minimum
      const currentRows = this.data.length;
      const spacersNeeded = Math.max(0, this.minRows - currentRows);
      return spacersNeeded;
    }
  },
  methods: {
    getRowKey(item, index) {
      if (typeof this.rowKey === 'function') {
        return this.rowKey(item, index);
      }
      return item[this.rowKey] || index;
    }
  }
};
</script>