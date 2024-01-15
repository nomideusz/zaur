<script>import "../app.pcss";</script>
<body>
    <header class="flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full text-sm">
      <nav class="relative max-w-[85rem] w-full mx-auto border-b border-gray-200 py-3 px-4 sm:py-0 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:border-x dark:border-gray-700" aria-label="Global">
        <div class="flex items-center justify-between py-6">
          <a class="flex-none text-xl font-semibold" href="#" aria-label="Brand">Zaur</a>
        </div>
      </nav>
    </header>
  
    <main id="content" role="main">
      <div class="max-w-[85rem] mx-auto min-h-screen border-x-gray-200 py-10 px-4 sm:px-6 lg:px-8 xl:border-x dark:border-x-gray-700">
        <slot />
      </div>
    </main>
  </body>
