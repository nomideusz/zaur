import { injectManifest } from 'workbox-build';

console.log('[PWA] Injecting precache manifest...');

try {
  const result = await injectManifest({
    globDirectory: 'build/client',
    globPatterns: ['**/*.{js,css,ico,png,svg,webp,webmanifest,json,woff2,woff}'],
    globIgnores: ['service-worker.js', '**/service-worker.js'],
    swSrc: 'build/client/service-worker.js',
    swDest: 'build/client/service-worker.js',
  });
  console.log(`[PWA] Success! Injected ${result.count} files (${result.size} bytes).`);
} catch (error) {
  console.error('[PWA] Injection failed:', error);
  process.exit(1);
}
