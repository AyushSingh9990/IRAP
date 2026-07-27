import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const indexableRoutes = [
  '/',
  '/about',
  '/contact',
  '/approved-modalities',
  '/membership',
  '/training-providers',
  '/organizations',
  '/directory',
  '/directory/courses',
  '/verify-course-certificate',
  '/directory/organizations',
  '/directory/training-providers',
  '/directory/members',
  '/articles',
  '/faq',
  '/code-of-ethics',
  '/complaints',
  '/privacy-policy',
  '/cookie-policy',
  '/terms-and-conditions',
  '/accessibility',
  '/legal-disclaimer',
];

function createSeoFilesPlugin(siteUrl) {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
  const publicDirectory = resolve(cwd(), 'public');

  const writeSeoFiles = () => {
    const sitemap = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...indexableRoutes.map(
        (route) => `  <url><loc>${normalizedSiteUrl}${route}</loc></url>`,
      ),
      '</urlset>',
      '',
    ].join('\n');

    const robots = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /dashboard',
      'Disallow: /login',
      'Disallow: /register',
      'Disallow: /forgot-password',
      'Disallow: /reset-password',
      'Disallow: /verify-email',
      'Disallow: /verify-email-change',
      `Sitemap: ${normalizedSiteUrl}/sitemap.xml`,
      '',
    ].join('\n');

    writeFileSync(resolve(publicDirectory, 'sitemap.xml'), sitemap);
    writeFileSync(resolve(publicDirectory, 'robots.txt'), robots);
  };

  return {
    name: 'irap-seo-files',
    buildStart: writeSeoFiles,
    configureServer: writeSeoFiles,
  };
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, cwd(), '');
  const siteUrl = environment.VITE_SITE_URL || 'http://localhost:5173';

  return {
    plugins: [createSeoFilesPlugin(siteUrl), react()],
    optimizeDeps: {
      exclude: ['country-state-city'],
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replaceAll('\\', '/');

            if (!normalizedId.includes('/node_modules/')) return undefined;

            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router/') ||
              normalizedId.includes('/node_modules/react-router-dom/')
            ) {
              return 'framework';
            }

            if (
              normalizedId.includes('/node_modules/react-hook-form/') ||
              normalizedId.includes('/node_modules/zod/') ||
              normalizedId.includes('/node_modules/@hookform/resolvers/')
            ) {
              return 'forms';
            }

            if (
              normalizedId.includes('/node_modules/leaflet/') ||
              normalizedId.includes('/node_modules/react-leaflet/') ||
              normalizedId.includes('/node_modules/@react-leaflet/')
            ) {
              return 'maps';
            }

            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      globals: true,
      css: true,
    },
  };
});
