module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const missing=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','GOOGLE_SHEETS_SPREADSHEET_ID']
    .filter(k=>!process.env[k]);
  if(missing.length) return res.status(503).json({error:'Google Sheets sync is not configured.',missing});

  try{
    const body=req.body||{};
    const orderId=String(body.orderId||'').trim();
    const syncAll=Boolean(body.syncAll||body.syncAdmins);

    const token=await getGoogleAccessToken();
    const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!process.env.SUPABASE_URL||!secret) throw new Error('Supabase server credentials are not configured.');
    const sbHeaders={apikey:secret,Authorization:'Bearer '+secret};

    const spreadsheetId=process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId);

    await ensureBusinessSheets(headers,spreadsheetId);

    const result=await rebuildAllSheets(headers,base,sbHeaders,{orderId,full:syncAll||!orderId});
    return res.status(200).json({ok:true,...result});
  }catch(e){
    console.error('Google Sheets sync:',e);
    return res.status(500).json({error:e.message||'Google Sheets sync failed.'});
  }
};

const BD_TIME_ZONE='Asia/Dhaka';

function formatBangladeshDateTime(value){
  if(!value)return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return String(value||'');
  return new Intl.DateTimeFormat('en-US',{
    timeZone:BD_TIME_ZONE,year:'numeric',month:'short',day:'numeric',
    hour:'numeric',minute:'2-digit',hour12:true
  }).format(d);
}

async function rebuildAllSheets(headers,base,sbHeaders,{orderId='',full=true}={}){
  const refs=await getJson(
    process.env.SUPABASE_URL+'/rest/v1/referral_codes?select=*&order=created_at.asc',
    sbHeaders
  );
  const admins=Array.isArray(refs)?refs:[];

  const orders=await getJson(
    process.env.SUPABASE_URL+'/rest/v1/orders?select=*&order=created_at.asc',
    sbHeaders
  );
  const orderList=Array.isArray(orders)?orders:[];

  const items=await getJson(
    process.env.SUPABASE_URL+'/rest/v1/order_items?select=*&order=id.asc',
    sbHeaders
  );
  const itemList=Array.isArray(items)?items:[];

  const itemsByOrder=new Map();
  for(const item of itemList){
    const id=String(item.order_id||'');
    if(!itemsByOrder.has(id))itemsByOrder.set(id,[]);
    itemsByOrder.get(id).push(item);
  }

  const adminByCode=new Map();
  for(const admin of admins){
    const code=String(admin.code||'').trim().toUpperCase();
    if(code)adminByCode.set(code,admin);
  }

  const orderRows=[[
    'Order ID','Order Date (BDT)','Customer Name','Phone','Email','Delivery Address',
    'District','Division','Thana / Upazila','Products','Qty','Subtotal','Discount',
    'Shipping','Total','Payment Method','Status','Admin Code','Admin Name','Admin Email',
    'Admin Benefit Type','Admin Benefit Value','Admin Code Usage','Admin Active',
    'Tracking Provider','Tracking Number','Tracking URL','Updated (BDT)','Admin Note'
  ]];

  const stats=new Map();

  for(const o of orderList){
    const code=String(o.referral_code||'').trim().toUpperCase();
    const admin=code?adminByCode.get(code):null;
    const orderItems=itemsByOrder.get(String(o.id||''))||[];
    const productNames=orderItems.map(i=>String(i.product_name||'Product')).join(' | ');
    const totalQty=orderItems.reduce((n,i)=>n+Number(i.quantity||0),0);
    const subtotal=Number(o.subtotal||0);
    const discount=Number(o.referral_discount ?? o.discount_amount ?? 0);
    const shipping=Number(o.shipping_charge||0);
    const total=Number(o.total ?? Math.max(0,subtotal+shipping-discount));

    orderRows.push([
      o.order_number||'',
      formatBangladeshDateTime(o.created_at),
      o.customer_name||'',
      o.phone||'',
      o.email||'',
      o.address||'',
      o.district||'',
      o.division||'',
      o.upazila||'',
      productNames,
      totalQty,
      subtotal,
      discount,
      shipping,
      total,
      o.payment_method||'Cash on Delivery',
      o.status||'New',
      code,
      admin?.admin_name||o.referral_admin_name||'',
      admin?.admin_email||'',
      admin?.benefit_type||'',
      Number(admin?.benefit_value||0),
      Number(admin?.used_count||0),
      admin?.active===false?'Disabled':'Active',
      o.tracking_provider||'',
      o.tracking_number||'',
      o.tracking_url||'',
      formatBangladeshDateTime(o.updated_at),
      o.admin_note||''
    ]);

    const key=code||'(No Admin Code)';
    const s=stats.get(key)||{
      code:key,
      adminName:admin?.admin_name||(key==='(No Admin Code)'?'Website':''),
      adminEmail:admin?.admin_email||'',
      orders:0,newCount:0,contacting:0,confirmed:0,processing:0,shipped:0,delivered:0,cancelled:0,
      grossSales:0,discount:0,netSales:0
    };

    s.orders++;
    const status=String(o.status||'New');
    if(status==='New')s.newCount++;
    if(status==='Contacting')s.contacting++;
    if(status==='Confirmed')s.confirmed++;
    if(status==='Processing')s.processing++;
    if(status==='Shipped')s.shipped++;
    if(status==='Delivered')s.delivered++;
    if(status==='Cancelled')s.cancelled++;
    s.grossSales+=subtotal;
    s.discount+=discount;
    s.netSales+=total;
    stats.set(key,s);
  }

  // Keep every admin/referral record visible even before its first order.
  for(const admin of admins){
    const code=String(admin.code||'').trim().toUpperCase();
    if(!code||stats.has(code))continue;
    stats.set(code,{
      code,
      adminName:admin.admin_name||'',
      adminEmail:admin.admin_email||'',
      orders:0,newCount:0,contacting:0,confirmed:0,processing:0,shipped:0,delivered:0,cancelled:0,
      grossSales:0,discount:0,netSales:0
    });
  }

  const adminRows=[[
    'Admin Code','Admin Name','Admin Email','Admin Phone','Benefit Type','Benefit Value',
    'Min Order','Max Discount','Usage Limit','Used Count','Active','Starts At','Expires At','Admin Note'
  ]];
  for(const a of admins){
    adminRows.push([
      a.code||'',a.admin_name||'',a.admin_email||'',a.admin_phone||'',
      a.benefit_type||'',Number(a.benefit_value||0),Number(a.min_order_amount||0),
      a.max_discount_amount==null?'':Number(a.max_discount_amount),
      a.usage_limit==null?'':Number(a.usage_limit),Number(a.used_count||0),
      a.active===false?'Disabled':'Active',
      formatBangladeshDateTime(a.starts_at),formatBangladeshDateTime(a.expires_at),a.note||''
    ]);
  }

  const summaryRows=[[
    'Admin Code','Admin Name','Admin Email','Orders','New','Contacting','Confirmed',
    'Processing','Shipped','Delivered','Cancelled','Gross Sales','Discount Given','Net Sales'
  ]];
  [...stats.values()]
    .sort((a,b)=>String(a.code).localeCompare(String(b.code)))
    .forEach(s=>summaryRows.push([
      s.code,s.adminName,s.adminEmail,s.orders,s.newCount,s.contacting,s.confirmed,
      s.processing,s.shipped,s.delivered,s.cancelled,s.grossSales,s.discount,s.netSales
    ]));

  let totalOrders=0,newCount=0,contacting=0,confirmed=0,processing=0,shipped=0,delivered=0,cancelled=0;
  let grossSales=0,discount=0,netSales=0;
  for(const s of stats.values()){
    if(s.code==='(No Admin Code)'){}
    totalOrders+=s.orders;newCount+=s.newCount;contacting+=s.contacting;confirmed+=s.confirmed;
    processing+=s.processing;shipped+=s.shipped;delivered+=s.delivered;cancelled+=s.cancelled;
    grossSales+=s.grossSales;discount+=s.discount;netSales+=s.netSales;
  }

  const activeAdmins=admins.filter(a=>a.active!==false).length;
  const adminsWithOrders=[...stats.values()].filter(s=>s.code!=='(No Admin Code)'&&s.orders>0).length;

  const dashboardRows=[
    ['GRABZONE — BUSINESS DATABASE'],
    ['Last updated (BDT)',formatBangladeshDateTime(new Date())],
    [],
    ['Metric','Value'],
    ['Total Admins',admins.length],
    ['Active Admins',activeAdmins],
    ['Admins With Orders',adminsWithOrders],
    ['Total Orders',totalOrders],
    ['New Orders',newCount],
    ['Contacting Orders',contacting],
    ['Confirmed Orders',confirmed],
    ['Processing Orders',processing],
    ['Shipped Orders',shipped],
    ['Delivered Orders',delivered],
    ['Cancelled Orders',cancelled],
    ['Gross Product Sales',grossSales],
    ['Customer Discount Given',discount],
    ['Net Customer Sales',netSales],
    [],
    ['Important','This sheet mirrors the Admin Panel referral/admin records and website orders.'],
    ['Profit note','Actual profit is not calculated because the Admin Panel does not store product cost/expense. Net Customer Sales is revenue after customer discounts, not profit.']
  ];

  // Clear before rewriting so deleted admins/orders cannot remain as stale rows.
  await clearValues(headers,base,'GZ Dashboard!A:Z');
  await clearValues(headers,base,'GZ Admin Registry!A:Z');
  await clearValues(headers,base,'GZ Admin Summary!A:Z');
  await clearValues(headers,base,'GZ Orders!A:AC');

  await writeValues(headers,base,'GZ Dashboard!A1:B'+dashboardRows.length,dashboardRows);
  await writeValues(headers,base,'GZ Admin Registry!A1:N'+adminRows.length,adminRows);
  await writeValues(headers,base,'GZ Admin Summary!A1:N'+summaryRows.length,summaryRows);
  await writeValues(headers,base,'GZ Orders!A1:AC'+orderRows.length,orderRows);

  return {
    orders:orderList.length,
    admins:admins.length,
    syncedOrder:orderId||null
  };
}

async function ensureBusinessSheets(headers,spreadsheetId){
  const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId);
  const data=await sheetsRequest('GET',base+'?fields=sheets.properties',headers);
  const sheets=Array.isArray(data.sheets)?data.sheets:[];
  const wanted=['GZ Dashboard','GZ Orders','GZ Admin Registry','GZ Admin Summary'];
  const existing=new Map(sheets.map(s=>[s.properties?.title,s.properties?.sheetId]));
  const requests=[];
  wanted.forEach(title=>{
    if(!existing.has(title))requests.push({addSheet:{properties:{title}}});
  });
  if(requests.length)await sheetsRequest('POST',base+':batchUpdate',headers,{requests});

  const after=await sheetsRequest('GET',base+'?fields=sheets.properties',headers);
  const map=new Map((after.sheets||[]).map(s=>[s.properties?.title,s.properties?.sheetId]));

  const widths={
    'GZ Dashboard':2,
    'GZ Orders':29,
    'GZ Admin Registry':14,
    'GZ Admin Summary':14
  };

  const formatRequests=[];
  for(const title of wanted){
    const sheetId=map.get(title);
    if(sheetId==null)continue;
    formatRequests.push(
      {updateSheetProperties:{
        properties:{sheetId,gridProperties:{frozenRowCount:title==='GZ Dashboard'?0:1}},
        fields:'gridProperties.frozenRowCount'
      }},
      {repeatCell:{
        range:{sheetId,startRowIndex:0,endRowIndex:1},
        cell:{userEnteredFormat:{
          backgroundColor:{red:0.06,green:0.08,blue:0.14},
          textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true,fontSize:10},
          horizontalAlignment:'CENTER',verticalAlignment:'MIDDLE'
        }},
        fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }},
      {updateDimensionProperties:{
        range:{sheetId,dimension:'COLUMNS',startIndex:0,endIndex:widths[title]},
        properties:{pixelSize:title==='GZ Dashboard'?170:125},
        fields:'pixelSize'
      }}
    );
  }
  if(formatRequests.length)await sheetsRequest('POST',base+':batchUpdate',headers,{requests:formatRequests});
  return map;
}

async function clearValues(headers,base,range){
  await sheetsRequest('POST',base+'/values/'+encodeURIComponent(range)+':clear',headers,{});
}

async function writeValues(headers,base,range,values){
  await sheetsRequest(
    'PUT',
    base+'/values/'+encodeURIComponent(range)+'?valueInputOption=USER_ENTERED',
    headers,
    {range,majorDimension:'ROWS',values}
  );
}

async function getGoogleAccessToken(){
  const body=new URLSearchParams({
    client_id:process.env.GOOGLE_CLIENT_ID,
    client_secret:process.env.GOOGLE_CLIENT_SECRET,
    refresh_token:process.env.GOOGLE_REFRESH_TOKEN,
    grant_type:'refresh_token'
  });
  const r=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.access_token)throw new Error(data.error_description||data.error||'Could not authenticate with Google.');
  return data.access_token;
}

async function sheetsRequest(method,url,headers,body){
  const r=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error?.message||data.error||'Google Sheets request failed.');
  return data;
}

async function getJson(url,headers){
  const r=await fetch(url,{headers});
  const data=await r.json().catch(()=>[]);
  if(!r.ok)throw new Error(data?.message||data?.error||'Supabase request failed.');
  return data;
}
