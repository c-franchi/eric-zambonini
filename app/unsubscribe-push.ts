export async function unsubscribePush(){
 try{const registration=await navigator.serviceWorker?.ready;const subscription=await registration?.pushManager.getSubscription();if(subscription){await fetch('/api/push',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})});await subscription.unsubscribe()}}catch{}
}
