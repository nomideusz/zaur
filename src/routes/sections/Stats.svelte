<script lang="ts">
  import { adsCount } from '$lib/adsCountStore';

</script>

<!-- Features -->
<div class="max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
    <!-- Grid -->
    <div class="mt-20 grid gap-6 grid-cols-2 sm:gap-12 lg:grid-cols-3 lg:gap-8">
      <!-- Stats -->
      <div>
        <h4 class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Number of Ads</h4>
        <p class="mt-2 sm:mt-3 text-4xl sm:text-6xl font-bold text-blue-600">
            {$adsCount}
        </p>
        <p class="mt-1 text-gray-500">unique ads without ads</p>
    </div>
      <!-- End Stats -->
  
      <!-- Stats -->
      <div>
        <h4 class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Number of Users</h4>
        <p class="mt-2 sm:mt-3 text-4xl sm:text-6xl font-bold text-blue-600">0</p>
        <p class="mt-1 text-gray-500">and counting</p>
      </div>
      <!-- End Stats -->
  
      <!-- Stats -->
      <div>
        <h4 class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Number of Zaurs</h4>
        <p class="mt-2 sm:mt-3 text-4xl sm:text-6xl font-bold text-blue-600">1</p>
        <p class="mt-1 text-gray-500">powerful</p>
      </div>
      <!-- End Stats -->
    </div>
    <!-- End Grid -->
  </div>
  <!-- End Features -->