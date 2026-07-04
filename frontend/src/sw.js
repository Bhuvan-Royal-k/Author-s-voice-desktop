import { precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// self.__WB_MANIFEST is injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Optional: you can add other workbox modules here
clientsClaim();
self.skipWaiting();
