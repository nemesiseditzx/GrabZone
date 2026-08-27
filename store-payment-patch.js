/* OPTIONAL: only needed if your store.js does not already remove direct hrefs from DM buttons.
   Your current GrabZone store-final.js already has the social chooser and removes direct hrefs. */
(function(){
  const PAYMENT_LINK='payment-method.html';
  function addPaymentLink(){
    const nav=document.querySelector('header nav');
    if(!nav||nav.querySelector('[href="payment-method.html"]'))return;
    const a=document.createElement('a');a.href=PAYMENT_LINK;a.dataset.i18n='payment';a.textContent=localStorage.getItem('grabzone_language')==='en'?'Payment':'পেমেন্ট';nav.appendChild(a);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',addPaymentLink):addPaymentLink();
})();
