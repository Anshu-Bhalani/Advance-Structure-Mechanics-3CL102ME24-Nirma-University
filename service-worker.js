"use strict";

/*
 * Offline app shell for GitHub Pages (including the /Structure-Analysis/ path).
 * Keep this list synchronized with index.html and the web app's local assets.
 * Increment CACHE_NAME for each offline-shell release so a failed install cannot
 * partially overwrite the currently active release cache.
 * No model data or calculation results are stored in Cache Storage.
 */
const CACHE_NAME = "structure-analysis-offline-v13";
const CACHE_PREFIX = "structure-analysis-offline-";

const CORE_ASSETS = [
    "index.html",
    "manifest.webmanifest",
    "assets/icons/structure-analysis.svg",
    "assets/images/nirma-shield-transparent.webp",
    "assets/images/nirma-university.webp",
    "assets/css/main.css",
    "assets/js/main.js",
    "assets/js/offline.js",
    "assets/vendor/jspdf.umd.min.js",
    "assets/vendor/pdf-fonts.js",
    "assets/vendor/svg2pdf.umd.min.js",
    "modules/dashboard/dashboard.css",
    "modules/dashboard/dashboard.js",
    "modules/elements/elements.js",
    "modules/home/home.css",
    "modules/home/home.js",
    "modules/load-case/load-case.js",
    "modules/load/load.js",
    "modules/moment-case/moment-case.js",
    "modules/moment/moment.js",
    "modules/nodes/nodes.js",
    "modules/results/diagrams/diagrams.css",
    "modules/results/diagrams/diagrams.js",
    "modules/results/results.css",
    "modules/results/results.js",
    "modules/results/step-1/step-1.js",
    "modules/results/step-2/step-2.js",
    "modules/results/step-3/step-3.js",
    "modules/results/step-4/step-4.js",
    "modules/results/step-5/step-5.js",
    "modules/results/step-6/step-6.js",
    "modules/results/step-7/step-7.js",
    "modules/results/step-8/step-8.css",
    "modules/results/step-8/step-8.js",
    "modules/supports/supports.js",
    "modules/tutorial/tutorial-beginner.js",
    "modules/tutorial/tutorial-grid.js",
    "modules/tutorial/tutorial.css",
    "modules/tutorial/tutorial.js"
];

function assetUrl(path) {
    return new URL(path, self.registration.scope);
}

function canonicalRequest(request) {
    const url = new URL(request.url);
    url.search = "";
    url.hash = "";
    return new Request(url.href, { method: "GET" });
}

async function cacheCoreAssets() {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_ASSETS.map(async (path) => {
        const url = assetUrl(path);
        const response = await fetch(new Request(url.href, { cache: "reload" }));
        if (!response || !response.ok) {
            throw new Error("Unable to cache required offline asset: " + path);
        }
        await cache.put(new Request(url.href), response.clone());
    }));
}

async function getOfflineStatus() {
    const cache = await caches.open(CACHE_NAME);
    let cachedCount = 0;
    for (const path of CORE_ASSETS) {
        const cached = await cache.match(new Request(assetUrl(path).href), { ignoreSearch: true });
        if (cached) cachedCount += 1;
    }
    return {
        type: "OFFLINE_STATUS",
        ready: cachedCount === CORE_ASSETS.length,
        cached: cachedCount,
        total: CORE_ASSETS.length
    };
}

self.addEventListener("install", (event) => {
    event.waitUntil((async () => {
        // Install only succeeds when every required app-shell file is available.
        // The currently active cache is retained if this installation fails.
        await cacheCoreAssets();
        await self.skipWaiting();
    })());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener("message", (event) => {
    if (event.data?.type !== "GET_OFFLINE_STATUS") return;
    event.waitUntil((async () => {
        const status = await getOfflineStatus();
        if (event.source && typeof event.source.postMessage === "function") {
            event.source.postMessage(status);
        }
    })());
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (!request || request.method !== "GET") return;

    const requestUrl = new URL(request.url);
    // Never attempt to cache external requests or anything outside this app.
    if (requestUrl.origin !== self.location.origin ||
        !requestUrl.pathname.startsWith(new URL(self.registration.scope).pathname)) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith((async () => {
            try {
                const response = await fetch(request);
                if (response && response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(new Request(assetUrl("index.html").href), response.clone());
                }
                return response;
            } catch (error) {
                const cache = await caches.open(CACHE_NAME);
                const cachedPage = await cache.match(new Request(assetUrl("index.html").href));
                if (cachedPage) return cachedPage;
                return new Response(
                    "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Offline</title><body><h1>Structure Analysis is not cached yet</h1><p>Connect to the internet and reload this page once to prepare offline access.</p></body></html>",
                    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
                );
            }
        })());
        return;
    }

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            // Network-first keeps the hosted files fresh while online.
            const response = await fetch(request);
            if (response && response.ok && response.type !== "opaque") {
                await cache.put(canonicalRequest(request), response.clone());
            }
            return response;
        } catch (error) {
            // Strip query strings to support the app's cache-busted script URLs.
            const cached = await cache.match(request, { ignoreSearch: true });
            if (cached) return cached;
            return new Response(
                "This resource is not in the offline cache yet. Reconnect and reload the app to cache it.",
                { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
            );
        }
    })());
});
