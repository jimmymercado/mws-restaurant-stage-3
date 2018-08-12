import { DBHelper } from "./dbhelper";

/* Adding Service Worker */
if('serviceWorker' in navigator){

    navigator.serviceWorker    
        .register('/service-worker.js', {scope: '/'})
        .then(function(registration){
            console.log('[serviceWorker] Registered');

            if(!navigator.serviceWorker.controller){return}

            if(registration.waiting){
                navigator.serviceWorker.controller.postMessage({action:'skipWaiting'});
            }

            if(registration.installing){
                navigator.serviceWorker.addEventListener('statechange', function(){
                    if(navigator.serviceWorker.controller.state=='installed'){
                        navigator.serviceWorker.controller.postMessage({action:'skipWaiting'});
                    }
                });
            }

            registration.addEventListener('updatefound', () =>{
                navigator.serviceWorker.addEventListener('statechange', () =>{
                    if(navigator.serviceWorker.controller.state='installed'){
                        navigator.serviceWorker.controller.postMessage({action:'skipWaiting'});
                    }
                })
            });
        })
        .catch(function(err){
            console.log('[serviceWorker] Unsupported', err);
        })

        var refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () =>{
            if(refreshing) return;
            window.location.reload();
            refreshing= true; 
        })


        navigator.serviceWorker.ready.then((registration) => {
            return registration.sync.register('syncPage');
        });
  }



function goingOffline() {
    console.log('[serviceWorker] offline');
}

function goingOnline() {
    console.log('[serviceWorker] online');
    DBHelper.submitPendingReview();
}

window.addEventListener('offline', goingOffline);
window.addEventListener('online', goingOnline);
