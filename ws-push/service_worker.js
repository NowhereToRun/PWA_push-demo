// Copyright 2016 Google Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//      http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var dataCacheName = 'pushTestData-v1';
var cacheName = 'pushTest-v1';
var filesToCache = [
  './',
  './index.html',
  './js/app.js',
  './css/inline.css',
  './images/try_57x57_v1.png',
  './images/try_114x114_v1.png',
  './images/try_144x144_v1.png',
];

function wsInit() {
  // wss is necessary for https
  console.log('wsInit new');
  var socket = new WebSocket('wss://47.94.14.224:25550', null, {
    protocolVersion: 8,
    origin: 'https://47.94.14.224:25550',
    rejectUnauthorized: false //重要，自签名证书只能这样设了。CA颁发的受信任证书就不需要了
  });
  socket.onopen = function (event) {
    socket.onmessage = function (event) {
      console.log('Client received a message', event);
      const title = event.data;
      const options = {
        body: 'Yay it works.',
      };

      const notificationPromise = self.registration.showNotification(title, options);

    };
    socket.onclose = function (event) {
      console.log('Client notified socket has closed', event);
    };
  };
}

self.addEventListener('install', function (e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(cacheName).then(function (cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate', function (e) {
  console.log('[ServiceWorker] Activate');
  // wsInit();
  e.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(keyList.map(function (key) {
        if (key !== cacheName && key !== dataCacheName) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  console.log('[Service Worker] Fetch', e.request.url);
  var dataUrl = 'https://query.yahooapis.com/v1/public/yql';
  var fakeUrl = 'https://my_fake.api.com';
  if (e.request.url.indexOf(dataUrl) > -1) {
    /*
     * "Cache then network" strategy:
     * https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
     */
    e.respondWith(
      caches.open(dataCacheName).then(function (cache) {
        return fetch(e.request).then(function (response) {
          cache.put(e.request.url, response.clone());
          return response;
        });
      })
    );
  } else if (e.request.url.indexOf(fakeUrl) > -1) {
    console.log('fake url');
    // wsInit();
    var nextPage = new Request('pushMsg');
    e.waitUntil(
      fetch(nextPage).then(function (response) {
        return caches.open(dataCacheName).then(function (cache) {
          console.log('Cached next page ' + response.url);
          return cache.put(nextPage, response).then(function(){
            console.log('cache put success')
            return new Response('HaHaHa');
          })
        });
      }));
    // e.respondWith(
    //   Promise.resolve('hahaha')
    // );
  } else {
    /*
     * The app is asking for app shell files.
     * "Cache, falling back to the network" offline strategy:
     * https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
     */
    e.respondWith(
      caches.match(e.request).then(function (response) {
        return response || fetch(e.request);
      })
    );
  }
});
