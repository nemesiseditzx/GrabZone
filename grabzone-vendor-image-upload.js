(function(){
  'use strict';
  var bound=new WeakSet();
  async function upload(file,scope){
    if(!file)return '';
    var fd=new FormData();fd.append('file',file);fd.append('scope',scope||'image');
    var r=await fetch('/api/vendor/admin/upload',{method:'POST',body:fd,credentials:'include',cache:'no-store'});
    var d=await r.json().catch(function(){return {}});if(!r.ok)throw new Error(d.error||('Upload failed ('+r.status+')'));return d.url||'';
  }
  function addPicker(input,scope){
    if(!input||bound.has(input))return;bound.add(input);input.type='text';
    var wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);input.style.flex='1 1 260px';
    var picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp,image/gif,image/avif';picker.style.cssText='max-width:240px';
    var note=document.createElement('span');note.textContent='Choose image from PC';note.style.cssText='font-size:12px;color:#777;font-weight:700';
    wrap.appendChild(picker);wrap.appendChild(note);
    picker.addEventListener('change',async function(){var file=picker.files&&picker.files[0];if(!file)return;note.textContent='Uploading…';try{var url=await upload(file,scope);input.value=url;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));note.textContent='Uploaded ✓';}catch(e){note.textContent=e.message||'Upload failed';picker.value='';}});
  }
  function scan(){
    addPicker(document.getElementById('logoUrl'),'vendor-logo');
    addPicker(document.getElementById('bannerUrl'),'vendor-banner');
    addPicker(document.getElementById('productImage'),'product');
    document.querySelectorAll('input[type="text"],input[type="url"]').forEach(function(i){var n=(i.name||i.id||'').toLowerCase();if(/(logo|banner|image_url|imageurl|product_image|productimage)/.test(n)&&!bound.has(i))addPicker(i,n.replace(/[^a-z0-9_-]/g,'').slice(0,30)||'image');});
  }
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
})();
