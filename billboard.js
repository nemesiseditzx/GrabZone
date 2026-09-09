/* GRABZONE — static marketplace hook */
(function(){
  function inject(){
    if(document.getElementById('gzStaticMarketplace'))return;
    const anchor=document.getElementById('billboard')||document.querySelector('main')||document.body;
    if(!anchor)return;
    const section=document.createElement('section');
    section.id='gzStaticMarketplace';
    section.style.cssText='max-width:1180px;margin:34px auto 50px;padding:0 18px;';
    section.innerHTML='<div style="border:1px solid #e7e7e3;border-radius:22px;padding:22px;background:#fff;box-shadow:0 12px 35px rgba(0,0,0,.05)"><div style="display:flex;justify-content:space-between;align-items:end;gap:18px;flex-wrap:wrap"><div><div style="font-size:10px;font-weight:900;letter-spacing:.16em;color:#ff6b00">GRABZONE MARKETPLACE</div><h2 style="margin:5px 0;font-size:clamp(24px,4vw,38px)">Shop by Brands</h2><p style="margin:0;color:#667085">Discover GrabZone and future partner brands in one place.</p></div><a href="marketplace.html" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 16px;border-radius:12px;font-weight:800">View Marketplace →</a></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:18px"><a href="marketplace.html" style="text-decoration:none;color:#111;border:1px solid #ecece8;border-radius:16px;padding:16px;background:#fff"><div style="width:54px;height:54px;border-radius:14px;background:#111;color:#fff;display:grid;place-items:center;font-weight:900;font-size:20px">GZ</div><h3 style="margin:12px 0 4px">GrabZone</h3><p style="margin:0;color:#777;font-size:13px">Official GrabZone store</p></a><div style="border:1px dashed #d7d7d2;border-radius:16px;padding:16px;background:#fafaf8"><div style="font-size:11px;font-weight:900;color:#888;letter-spacing:.08em">COMING SOON</div><h3 style="margin:12px 0 4px">Partner Brands</h3><p style="margin:0;color:#777;font-size:13px">More brands will appear here as vendors join.</p></div></div></div>';
    anchor.insertAdjacentElement('afterend',section);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  setTimeout(inject,800);setTimeout(inject,1800);
})();
