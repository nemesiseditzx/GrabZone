module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const missing=['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','GOOGLE_SHEETS_SPREADSHEET_ID'].filter(k=>!process.env[k]);
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
    const orders=await getJson(process.env.SUPABASE_URL+'/rest/v1/orders?id=eq.'+encodeURIComponent(orderId)+'&select=*',sbHeaders);
    if(!Array.isArray(orders)||!orders[0]) return res.status(404).json({error:'Order not found.'});
    const o=orders[0];
    const items=await getJson(process.env.SUPABASE_URL+'/rest/v1/order_items?order_id=eq.'+encodeURIComponent(orderId)+'&select=*&order=id.asc',sbHeaders);
    if(!Array.isArray(items)) throw new Error('Could not load order items.');
    let ref=null;
    if(o.referral_code){
      const refs=await getJson(process.env.SUPABASE_URL+'/rest/v1/referral_codes?code=eq.'+encodeURIComponent(o.referral_code)+'&select=admin_name,code&limit=1',sbHeaders);
      ref=Array.isArray(refs)&&refs[0]?refs[0]:null;
    }
    const names=items.map(i=>String(i.product_name||'Product')).join(' | ');
    const totalQty=items.reduce((n,i)=>n+Number(i.quantity||0),0);
    const productTotal=Number(o.subtotal||0);
    const avgUnit=totalQty?productTotal/totalQty:0;
    const row=[
      o.order_number||'',o.created_at||'',o.customer_name||'',o.phone||'',o.address||'',
      o.district||'',o.division||'',o.upazila||'',names,totalQty||'',avgUnit,productTotal,
      o.referral_code||'',Number(o.referral_discount||0),Number(o.shipping_charge||0),Number(o.total||0),
      ref?.admin_name||'','', 'Website', o.payment_method||'Cash on Delivery',
      paymentStatus(o),o.status||'New',o.tracking_provider||'',o.tracking_number||'',o.tracking_url||'',
      o.delivery_date||'',o.admin_note||''
    ];
    const spreadsheetId=process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId);
    await ensureSheet(headers,spreadsheetId,'Customer Record');
    const read=await sheetsRequest('GET',base+'/values/'+encodeURIComponent('Customer Record!A4:AA'),headers);
    const values=Array.isArray(read.values)?read.values:[];
    let rowNumber=0;
    for(let i=1;i<values.length;i++){
      if(String(values[i]?.[0]||'').trim()===String(o.order_number||'').trim()){rowNumber=4+i;break;}
    }
    if(rowNumber){
      await sheetsRequest('PUT',base+'/values/'+encodeURIComponent('Customer Record!A'+rowNumber+':AA'+rowNumber)+'?valueInputOption=USER_ENTERED',headers,{
        range:'Customer Record!A'+rowNumber+':AA'+rowNumber,majorDimension:'ROWS',values:[row]
      });
    }else{
      await sheetsRequest('POST',base+'/values/'+encodeURIComponent('Customer Record!A5:AA5')+':append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS',headers,{
        range:'Customer Record!A5:AA5',majorDimension:'ROWS',values:[row]
      });
    }
    return res.status(200).json({ok:true,orderNumber:o.order_number,row:rowNumber||'appended'});
  }catch(e){
    console.error('Google Sheets sync:',e);
    return res.status(500).json({error:e.message||'Google Sheets sync failed.'});
  }
};
function paymentStatus(o){
  return String(o.payment_method||'').toLowerCase().includes('paid')?'Paid':'Pending';
}
async function getGoogleAccessToken(){
  const body=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,refresh_token:process.env.GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
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
async function ensureSheet(headers,spreadsheetId,title){
  const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId);
  const data=await sheetsRequest('GET',base+'?fields=sheets.properties',headers);
  const found=(data.sheets||[]).some(s=>s.properties?.title===title);
  if(found)return;
  await sheetsRequest('POST',base+':batchUpdate',headers,{requests:[{addSheet:{properties:{title}}}]});
}
