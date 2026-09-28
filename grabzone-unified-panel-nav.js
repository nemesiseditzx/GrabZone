(()=>{'use strict';
if(window.__gzUnifiedPanelNavLoaded)return;window.__gzUnifiedPanelNavLoaded=true;
const path=location.pathname.toLowerCase();
const icon={
home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></svg>',
grid:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
orders:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M10 13h6M10 17h6"/></svg>',
store:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18l-2-7H5z"/><path d="M5 10v11h14V10M9 21v-7h6v7"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>',
chart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/></svg>',
settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z"/></svg>',
vendor:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6M8 9h.01M12 9h.01M16 9h.01"/></svg>',
cart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>'
};
const admin=[
['Overview','/admin.html','home'],['Vendors','/vendor-admin.html','vendor'],['Products','/marketplace-products.html','grid'],['Orders','/marketplace-admin-orders.html','orders'],['Sales','/marketplace-sales.html','chart'],['Shipping','/marketplace-shipping.html','cart'],['Stores','/marketplace-stores.html','store'],['Settings','/marketplace-settings.html','settings']
];
const vendor=[['Dashboard','/vendor-dashboard.html#dashboard','home'],['Products','/vendor-dashboard.html#products','grid'],['Orders','/vendor-dashboard.html#orders','orders'],['Store','/vendor-dashboard.html#store','store'],['Settings','/vendor-dashboard.html#settings','settings']];
const orderPage=path.includes('orders');
const salesPage=path.includes('sales');
const shippingPage=path.includes('shipping');
const storesPage=path.includes('stores');\nconst productsPage=path.includes('products');
const settingsPage=path.includes('settings');
const controlPage=path.includes('vendor-control');
const vendorPage=path.includes('vendor-dashboard')||path.includes('vendor-login');
const isAdminMain=path.endsWith('/admin.html');
const items=vendorPage?vendor:admin;
const vendorTab=({products:'Products',orders:'Orders',store:'Store',settings:'Settings'})[location.hash.slice(1)]||'Dashboard';\nconst current=vendorPage?vendorTab:isAdminMain?'Overview':orderPage?'Orders':salesPage?'Sales':productsPage?'Products':shippingPage?'Shipping':storesPage?'Stores':settingsPage?'Settings':'Vendors';
function link(item,cls){const [label,url,ico]=item;const a=document.createElement('a');a.className=cls+(label===current?' is-active':'');a.href=url;a.innerHTML=(icon[ico]||icon.grid)+'<span>'+label+'</span>';if(label===current)a.setAttribute('aria-current','page');return a}
function mount(){
 if(document.querySelector('.gz-unified-topnav'))return;
 const top=document.createElement('nav');top.className='gz-unified-topnav';top.setAttribute('aria-label','Dashboard navigation');
 const inner=document.createElement('div');inner.className='gz-unified-topnav__inner';
 const brand=document.createElement('a');brand.className='gz-unified-brand';brand.href=vendorPage?'/vendor-dashboard.html':'/admin.html';brand.innerHTML='Grab<span>Zone</span>';inner.appendChild(brand);
 items.forEach(x=>inner.appendChild(link(x,'gz-unified-toplink')));
 top.appendChild(inner);
 const header=document.querySelector('.gz-top,.topbar,header');
 if(header&&header.parentNode)header.insertAdjacentElement('afterend',top);else document.body.insertBefore(top,document.body.firstChild);
 const dock=document.createElement('nav');dock.className='gz-unified-dock';dock.setAttribute('aria-label','Quick navigation');
 const dockItems=vendorPage?[
 ['Home','/vendor-dashboard.html#dashboard','home'],['Products','/vendor-dashboard.html#products','grid'],['Orders','/vendor-dashboard.html#orders','orders'],['Store','/vendor-dashboard.html#store','store'],['Settings','/vendor-dashboard.html#settings','settings'],['Admin','/vendor-admin.html','vendor']
 ]:[
 ['Home','/admin.html','home'],['Vendors','/vendor-admin.html','vendor'],['Orders','/marketplace-admin-orders.html','orders'],['Sales','/marketplace-sales.html','chart'],['Stores','/marketplace-stores.html','store'],['Settings','/marketplace-settings.html','settings']
 ];
 dockItems.forEach(x=>dock.appendChild(link(x,'gz-unified-docklink')));
 document.body.appendChild(dock);document.body.classList.add('gz-has-unified-dock');
 if(vendorPage&&location.hash){const name=location.hash.slice(1);const b=document.querySelector('[data-section="'+name+'"]');if(b)b.click()}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();