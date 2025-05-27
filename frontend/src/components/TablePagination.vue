<template>
  <div class="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <!-- Left: Page navigation buttons -->
      <div class="flex items-center justify-center sm:justify-start">
        <nav class="flex items-center space-x-1" aria-label="Pagination">
          <!-- Previous page arrow -->
          <button
            :disabled="!pagination.hasPrev"
            @click="$emit('page-change', pagination.page - 1)"
            :class="{
              'opacity-40 cursor-not-allowed': !pagination.hasPrev,
              'hover:bg-gray-50 dark:hover:bg-gray-700': pagination.hasPrev
            }"
            class="px-2 py-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-l-lg transition-colors duration-150"
          >
            <ChevronDownIcon class="h-4 w-4 transform rotate-90" />
          </button>
          
          <!-- Page numbers -->
          <div class="flex">
            <template v-for="page in getVisiblePages()" :key="page">
              <button
                v-if="page !== '...'"
                @click="$emit('page-change', page)"
                :class="{
                  'bg-brand-600 text-white border-brand-600 shadow-sm dark:bg-brand-600 dark:border-brand-600': page === pagination.page,
                  'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700': page !== pagination.page
                }"
                class="px-3 py-1.5 text-sm font-medium border -ml-px transition-colors duration-150 min-w-[40px]"
              >
                {{ page }}
              </button>
              <span v-else class="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border -ml-px">
                ...
              </span>
            </template>
          </div>
          
          <!-- Next page arrow -->
          <button
            :disabled="!pagination.hasNext"
            @click="$emit('page-change', pagination.page + 1)"
            :class="{
              'opacity-40 cursor-not-allowed': !pagination.hasNext,
              'hover:bg-gray-50 dark:hover:bg-gray-700': pagination.hasNext
            }"
            class="px-2 py-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-r-lg -ml-px transition-colors duration-150"
          >
            <ChevronDownIcon class="h-4 w-4 transform -rotate-90" />
          </button>
        </nav>
      </div>
      
      <!-- Right: Items info and per-page selector -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 text-center sm:text-right">
        <!-- Showing X to Y of Z results -->
        <div class="text-sm text-gray-700 dark:text-gray-300 order-2 sm:order-1">
          Showing {{ startItem }} to {{ endItem }} of {{ pagination.total }} results
        </div>
        
        <!-- Items per page selector -->
        <div class="flex items-center justify-center sm:justify-end space-x-2 order-1 sm:order-2">
          <label for="per-page" class="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Show:
          </label>
          <select
            id="per-page"
            :value="perPage"
            @change="$emit('per-page-change', parseInt($event.target.value))"
            class="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import ChevronDownIcon from './icons/ChevronDownIcon.vue';

export default {
  name: 'TablePagination',
  components: {
    ChevronDownIcon
  },
  props: {
    pagination: {
      type: Object,
      required: true
    },
    perPage: {
      type: Number,
      required: true
    }
  },
  emits: ['page-change', 'per-page-change'],
  setup(props) {
    const startItem = computed(() => {
      if (props.pagination.total === 0) return 0;
      return (props.pagination.page - 1) * props.pagination.limit + 1;
    });

    const endItem = computed(() => {
      const end = props.pagination.page * props.pagination.limit;
      return Math.min(end, props.pagination.total);
    });

    const getVisiblePages = () => {
      const current = props.pagination.page;
      const total = props.pagination.totalPages;
      const maxVisible = 7;
      
      if (total <= maxVisible) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }
      
      const pages = [];
      
      if (current <= 4) {
        // Show: 1 2 3 4 5 ... last
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        // Show: 1 ... last-4 last-3 last-2 last-1 last
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // Show: 1 ... current-1 current current+1 ... last
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      }
      
      return pages;
    };

    return {
      startItem,
      endItem,
      getVisiblePages
    };
  }
};
</script>