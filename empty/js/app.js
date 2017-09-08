(function () {
    'use strict';
    function showNotification() {
        Notification.requestPermission(function (result) {
            if (result === 'granted') {
                navigator.serviceWorker.ready.then(function (registration) {
                    console.log('success');
                });
            }
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./service_worker.js')
            .then(function () {
                // alert('Service Worker Registered');
                console.log('Service Worker Registered');
            });
        // showNotification();
    }


})();
