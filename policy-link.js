/* GRABZONE POLICY LINK
   Add this file to the storefront and it will automatically add
   a Policies link to the footer without changing the existing footer HTML.
*/
(function(){
  function addPolicyLink(){
    const footer=document.querySelector('footer');
    if(!footer || footer.querySelector('[data-grabzone-policy-link]')) return;

    const links=footer.querySelector('.footer-links');
    const a=document.createElement('a');
    a.href='policies.html';
    a.target='_self';
    a.setAttribute('data-grabzone-policy-link','true');
    a.textContent=(localStorage.getItem('grabzoneLanguage')==='en'?'Policies':'নীতিমালা');

    if(links){
      links.appendChild(a);
    }else{
      a.style.display='inline-block';
      a.style.marginTop='10px';
      footer.appendChild(a);
    }

    // Keep the label synced with the existing language switch.
    window.addEventListener('grabzone-language-changed', function(e){
      a.textContent=e.detail?.lang==='en'?'Policies':'নীতিমালা';
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',addPolicyLink);
  }else{
    addPolicyLink();
  }
})();
