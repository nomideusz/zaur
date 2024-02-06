<script lang="ts">
  import { adsCount } from '$lib/adsCountStore';
  import Typewriter from 'svelte-typewriter';
  let randomNumber =  Math.floor(Math.random() * 9999);
  $: numberOfAds = $adsCount ? $adsCount : 0;
</script>
<Typewriter mode="scramble">
<!-- Features -->
<div class="max-w-[85rem] px-4 sm:px-6 lg:px-8 mx-auto">
    <!-- Grid -->
    <div class="mt-20 grid gap-6 grid-cols-2 sm:gap-12 lg:grid-cols-3 lg:gap-8">
      <!-- Stats -->
      <div>
        <h4 data-static class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Number of Ads</h4>
        <p class="mt-2 sm:mt-3 text-4xl sm:text-6xl font-bold bg-clip-text bg-gradient-to-tr from-blue-600 to-purple-400 text-transparent">
          {numberOfAds}
        </p>
        <p data-static class="mt-1 text-gray-500">unique ads without ads</p>
    </div>
      <!-- End Stats -->
  
      <!-- Stats -->
      <div>
        <h4 data-static class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">Number of Zaurs</h4>
        <p class="mt-2 sm:mt-3 text-4xl sm:text-6xl font-bold bg-clip-text bg-gradient-to-tr from-blue-600 to-purple-400 text-transparent">1</p>
        <p data-static class="mt-1 text-gray-500">powerful</p>
      </div>
      <!-- End Stats -->
            <!-- Stats -->
            <div>
              <h4 data-static class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200">A Random Number</h4>
              <p class="mt-2 sm:mt-3 text-4xl sm:text-6xl font-bold bg-clip-text bg-gradient-to-tr from-blue-600 to-purple-400 text-transparent">{randomNumber}</p>
              <p data-static class="mt-1 text-gray-500">between 0 and 9999</p>
            </div>
            <!-- End Stats -->
    </div>
    <!-- End Grid -->
  </div>
  <!-- End Features -->
</Typewriter>