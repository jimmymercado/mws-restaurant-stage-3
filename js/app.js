import { DBHelper } from "./dbhelper";

/* Adding Service Worker */
if('serviceWorker' in navigator){

    navigator.serviceWorker    
        .register('/service-worker.js', {scope: '/'})
        .then(function(registration){
            console.log('[serviceWorker] Registered');
        })
        .catch(function(err){
            console.log('[serviceWorker] Unsupported', err);
        })
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
