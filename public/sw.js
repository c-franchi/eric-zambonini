const CACHE='eric-pwa-offline-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html')));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{if(event.request.mode!=='navigate')return;event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')))});
self.addEventListener('notificationclick',event=>{event.notification.close();const path=event.notification.data?.url||'/admin/agenda';event.waitUntil(self.clients.openWindow(path))});
self.addEventListener('push',event=>{let item={title:'Eric Zambonini',body:'Você tem uma atualização.',url:'/cliente'};try{item={...item,...event.data.json()}}catch{}const path=typeof item.url==='string'&&item.url.startsWith('/')&&!item.url.startsWith('//')?item.url:'/cliente';event.waitUntil(self.registration.showNotification(item.title,{body:item.body,icon:'/pwa-192.png',badge:'/pwa-192.png',data:{url:path}}))});
