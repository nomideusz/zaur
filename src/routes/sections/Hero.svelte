<script lang="ts">
  import logo from '$lib/img/zaur.png?enhanced&w=400';
  import Butt from '$lib/components/ui/butt/butt.svelte';
</script>
<main id="content" class="flex items-center justify-center w-full mx-auto">
  <div class="text-center px-4 sm:px-6 lg:px-8 relative z-10">
    <h1 class="mb-4 sm:mb-8 text-4xl text-white sm:text-6xl">
      This <span class=" font-bold bg-clip-text bg-gradient-to-tr from-blue-600 to-purple-400 text-transparent">is</span>
  </h1>
  <enhanced:img class="mb-4 sm:mb-8" src={logo} alt="Zaur" />

  <!-- Buttons -->
  <div class="mt-8 flex justify-center">
      <Butt href="/sales">
          proceed with caution
      </Butt>
  </div>
  <!-- End Buttons -->
  </div>
</main>
