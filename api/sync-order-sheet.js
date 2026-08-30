module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const missing=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','GOOGLE_SHEETS_SPREADSHEET_ID']
    .filter(k=>!process.env[k]);
  if(missing.length) return res.status(503).json({error:'Google Sheets sync is not configured.',missing});

  try{
    const body=req.body||{};
    const orderId=String(body.orderId||'').trim();
    if(!orderId) return res.status(400).json({error:'Missing order ID.'});

    const token=await getGoogleAccessToken();
    const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
    const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!process.env.SUPABASE_URL||!secret) throw new Error('Supabase server credentials are not configured.');
    const sbHeaders={apikey:secret,Authorization:'Bearer '+secret};

    const orderRows=await getJson(
      process.env.SUPABASE_URL+'/rest/v1/orders?id=eq.'+encodeURIComponent(orderId)+'&select=*',
      sbHeaders
    );
    if(!Array.isArray(orderRows)||!orderRows[0]) return res.status(404).json({error:'Order not found.'});
    const o=orderRows[0];

    const items=await getJson(
      process.env.SUPABASE_URL+'/rest/v1/order_items?order_id=eq.'+encodeURIComponent(orderId)+'&select=*&order=id.asc',
      sbHeaders
    );
    if(!Array.isArray(items)) throw new Error('Could not load order items.');

    const refs=await getJson(
      process.env.SUPABASE_URL+'/rest/v1/referral_codes?select=code,admin_name,admin_email,used_count&order=created_at.asc',
      sbHeaders
    );
    const referralList=Array.isArray(refs)?refs:[];

    const spreadsheetId=process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId);

    const sheetInfo=await ensureBusinessSheets(headers,spreadsheetId);
    const setupRows=await readSheetValues(headers,base,'GZ Admin Setup!A2:F1000');
    const setupByCode=new Map();

    for(const row of setupRows){
      const code=String(row?.[0]||'').trim().toUpperCase();
      if(!code) continue;
      setupByCode.set(code,{
        code,
        adminName:String(row?.[1]||'').trim(),
        ownerName:String(row?.[2]||'').trim(),
        commissionType:String(row?.[3]||'Percentage').trim(),
        commissionValue:Number(row?.[4]||0),
        note:String(row?.[5]||'').trim()
      });
    }

    // Keep the setup sheet synchronized with every active/known referral code.
    const defaultOwner=String(process.env.GRABZONE_OWNER_NAME||'').trim();
    for(const ref of referralList){
      const code=String(ref.code||'').trim().toUpperCase();
      if(!code) continue;
      if(!setupByCode.has(code)){
        setupByCode.set(code,{
          code,
          adminName:String(ref.admin_name||'').trim(),
          ownerName:defaultOwner,
          commissionType:'Percentage',
          commissionValue:0,
          note:''
        });
      }else{
        const s=setupByCode.get(code);
        if(!s.adminName) s.adminName=String(ref.admin_name||'').trim();
        if(!s.ownerName&&defaultOwner) s.ownerName=defaultOwner;
      }
    }

    const setupMatrix=[['Admin Code','Admin Name','Owner Name','Commission Type','Commission Value','Note']];
    [...setupByCode.values()].forEach(s=>setupMatrix.push([
      s.code,s.adminName,s.ownerName,s.commissionType,s.commissionValue,s.note
    ]));
    await writeValues(headers,base,'GZ Admin Setup!A1:F'+Math.max(1,setupMatrix.length),setupMatrix);

    const code=String(o.referral_code||'').trim().toUpperCase();
    const setup=code?setupByCode.get(code):null;
    const adminName=setup?.adminName || referralList.find(r=>String(r.code||'').trim().toUpperCase()===code)?.admin_name || o.referral_admin_name || '';
    const ownerName=setup?.ownerName || defaultOwner || '';

    const productNames=items.map(i=>String(i.product_name||'Product')).join(' | ');
    const totalQty=items.reduce((n,i)=>n+Number(i.quantity||0),0);
    const subtotal=Number(o.subtotal||0);
    const discount=Number(o.referral_discount ?? o.discount_amount ?? 0);
    const shipping=Number(o.shipping_charge||0);
    const total=Number(o.total ?? Math.max(0,subtotal+shipping-discount));

    let adminEarnings=0;
    if(setup&&setup.commissionValue>0){
      if(String(setup.commissionType).toLowerCase().startsWith('fixed')){
        adminEarnings=Math.min(Number(setup.commissionValue||0),Math.max(0,total));
      }else{
        adminEarnings=Math.max(0,(subtotal-discount))*Number(setup.commissionValue||0)/100;
      }
    }

    const customerRow=[
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
      adminName,
      ownerName,
      adminEarnings,
      o.tracking_provider||'',
      o.tracking_number||'',
      o.tracking_url||'',
      formatBangladeshDateTime(o.updated_at),
      o.admin_note||''
    ];

    await upsertSimpleRow(
      headers,base,'GZ Orders','A2:Z10000',
      customerRow,o.order_number
    );

    await rebuildAdminSummary(headers,base,setupByCode,defaultOwner);
    await rebuildDashboard(headers,base);

    return res.status(200).json({
      ok:true,
      orderNumber:o.order_number,
      adminCode:code||null,
      adminName:adminName||null,
      ownerName:ownerName||null,
      adminEarnings
    });
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

async function ensureBusinessSheets(headers,spreadsheetId){
  const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId);
  const data=await sheetsRequest('GET',base+'?fields=sheets.properties',headers);
  const sheets=Array.isArray(data.sheets)?data.sheets:[];
  const wanted=['GZ Dashboard','GZ Orders','GZ Admin Summary','GZ Admin Setup'];
  const existing=new Map(sheets.map(s=>[s.properties?.title,s.properties?.sheetId]));

  const requests=[];
  wanted.forEach(title=>{
    if(!existing.has(title)) requests.push({addSheet:{properties:{title}}});
  });

  if(requests.length) await sheetsRequest('POST',base+':batchUpdate',headers,{requests});

  const after=await sheetsRequest('GET',base+'?fields=sheets.properties',headers);
  const map=new Map((after.sheets||[]).map(s=>[s.properties?.title,s.properties?.sheetId]));

  await sheetsRequest('POST',base+':batchUpdate',headers,{
    requests:wanted.flatMap(title=>{
      const sheetId=map.get(title);
      if(sheetId==null)return [];
      const isDashboard=title==='GZ Dashboard';
      return [
        {updateSheetProperties:{
          properties:{sheetId,gridProperties:{frozenRowCount:isDashboard?0:1}},
          fields:'gridProperties.frozenRowCount'
        }},
        {repeatCell:{
          range:{sheetId,startRowIndex:0,endRowIndex:1},
          cell:{
            userEnteredFormat:{
              backgroundColor:{red:0.06,green:0.08,blue:0.14},
              textFormat:{foregroundColor:{red:1,green:1,blue:1},bold:true,fontSize:10},
              horizontalAlignment:'CENTER',
              verticalAlignment:'MIDDLE'
            }
          },
          fields:'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }},
        {updateDimensionProperties:{
          range:{sheetId,dimension:'COLUMNS',startIndex:0,endIndex:isDashboard?10:26},
          properties:{pixelSize:isDashboard?150:125},
          fields:'pixelSize'
        }}
      ];
    })
  });

  return map;
}

async function writeValues(headers,base,range,values){
  await sheetsRequest(
    'PUT',
    base+'/values/'+encodeURIComponent(range)+'?valueInputOption=USER_ENTERED',
    headers,
    {range,majorDimension:'ROWS',values}
  );
}

async function readSheetValues(headers,base,range){
  const data=await sheetsRequest('GET',base+'/values/'+encodeURIComponent(range),headers);
  return Array.isArray(data.values)?data.values:[];
}

async function upsertSimpleRow(headers,base,titleRange,row,orderNumber){
  const match=String(orderNumber||'').trim();
  const read=await readSheetValues(headers,base,titleRange);
  const values=read;
  const startRow=2;
  let target=0;

  for(let i=0;i<values.length;i++){
    if(String(values[i]?.[0]||'').trim()===match){
      target=startRow+i;
      break;
    }
  }
  if(!target){
    for(let i=0;i<values.length;i++){
      if(!String(values[i]?.[0]||'').trim()){
        target=startRow+i;
        break;
      }
    }
  }
  if(!target)target=startRow+values.length;

  const range=titleRange.split('!')[0]+'!A'+target+':Z'+target;
  await writeValues(headers,base,range,[row]);
}

async function rebuildAdminSummary(headers,base,setupByCode,defaultOwner){
  const orders=await readSheetValues(headers,base,'GZ Orders!A2:Z10000');
  const stats=new Map();

  for(const row of orders){
    const orderId=String(row?.[0]||'').trim();
    if(!orderId)continue;
    const code=String(row?.[17]||'').trim().toUpperCase()||'(No Admin Code)';
    const existing=stats.get(code)||{
      code,
      adminName:code==='(No Admin Code)'?'Website':String(row?.[18]||'').trim(),
      ownerName:code==='(No Admin Code)'?'':String(row?.[19]||'').trim()||defaultOwner,
      orders:0,confirmed:0,delivered:0,cancelled:0,
      sales:0,discount:0,adminEarnings:0
    };

    existing.orders++;
    const status=String(row?.[16]||'').trim();
    if(status==='Confirmed')existing.confirmed++;
    if(status==='Delivered')existing.delivered++;
    if(status==='Cancelled')existing.cancelled++;
    existing.sales+=Number(row?.[14]||0);
    existing.discount+=Number(row?.[12]||0);
    existing.adminEarnings+=Number(row?.[20]||0);
    stats.set(code,existing);
  }

  for(const s of setupByCode.values()){
    if(!stats.has(s.code)){
      stats.set(s.code,{
        code:s.code,adminName:s.adminName,ownerName:s.ownerName||defaultOwner,
        orders:0,confirmed:0,delivered:0,cancelled:0,sales:0,discount:0,adminEarnings:0
      });
    }
  }

  const rows=[[
    'Admin Code','Admin Name','Owner Name','Orders','Confirmed','Delivered',
    'Cancelled','Customer Sales','Discount Given','Admin Earnings'
  ]];

  [...stats.values()].sort((a,b)=>String(a.code).localeCompare(String(b.code))).forEach(s=>{
    rows.push([
      s.code,s.adminName,s.ownerName,s.orders,s.confirmed,s.delivered,
      s.cancelled,s.sales,s.discount,s.adminEarnings
    ]);
  });

  await writeValues(headers,base,'GZ Admin Summary!A1:J'+rows.length,rows);
}

async function rebuildDashboard(headers,base){
  const orders=await readSheetValues(headers,base,'GZ Orders!A2:Z10000');
  let totalOrders=0,confirmed=0,delivered=0,cancelled=0,sales=0,discount=0,adminEarnings=0;

  for(const row of orders){
    if(!String(row?.[0]||'').trim())continue;
    totalOrders++;
    const status=String(row?.[16]||'').trim();
    if(status==='Confirmed')confirmed++;
    if(status==='Delivered')delivered++;
    if(status==='Cancelled')cancelled++;
    sales+=Number(row?.[14]||0);
    discount+=Number(row?.[12]||0);
    adminEarnings+=Number(row?.[20]||0);
  }

  const rows=[
    ['GRABZONE — BUSINESS DASHBOARD'],
    ['Last updated (BDT)',formatBangladeshDateTime(new Date())],
    [],
    ['Metric','Value'],
    ['Total Orders',totalOrders],
    ['Confirmed Orders',confirmed],
    ['Delivered Orders',delivered],
    ['Cancelled Orders',cancelled],
    ['Customer Sales',sales],
    ['Discount Given',discount],
    ['Admin Earnings',adminEarnings],
    ['Sales After Admin Earnings',sales-adminEarnings],
    [],
    ['How it works'],
    ['Orders','Every website order is stored here with customer + admin/referral details.'],
    ['Admin Summary','Automatically groups sales, order counts and admin earnings by admin code.'],
    ['Admin Setup','Set Owner Name and Commission Type/Value once per admin code.']
  ];
  await writeValues(headers,base,'GZ Dashboard!A1:B'+rows.length,rows);
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
  if(!r.ok||!data.access_token) throw new Error(data.error_description||data.error||'Could not authenticate with Google.');
  return data.access_token;
}

async function sheetsRequest(method,url,headers,body){
  const r=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error?.message||data.error||'Google Sheets request failed.');
  return data;
}

async function getJson(url,headers){
  const r=await fetch(url,{headers});
  const data=await r.json().catch(()=>[]);
  if(!r.ok) throw new Error(data?.message||data?.error||'Supabase request failed.');
  return data;
}