const TRACK_MARKER='[[GRABZONE_TRACKING]]';

function json(res){return res.json().catch(()=>({}));}

async function supabase(path,options={}){
  const url=process.env.SUPABASE_URL||'https://omfmecdugwadwskennyr.supabase.co';
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'sb_publishable_mO4ASdgjeNFnoxxls8YDlg_hm1qsNSu';
  return fetch(url+'/rest/v1/'+path,{
    ...options,
    headers:{
      apikey:key,
      Authorization:'Bearer '+key,
      'Content-Type':'application/json',
      ...(options.headers||{})
    }
  });
}

function parseLegacyTracking(note){
  const text=String(note||'');
  const line=text.split(TRACK_MARKER)[1];
  if(!line)return {trackingNumber:'',courier:'',trackingUrl:''};
  try{
    return {
      trackingNumber:'',
      courier:'',
      trackingUrl:'',
      ...JSON.parse(line.split('[[/GRABZONE_TRACKING]]')[0])
    };
  }catch{
    return {trackingNumber:'',courier:'',trackingUrl:''};
  }
}

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});

  const trackingId=String(req.query?.trackingId||'').trim();
  if(!trackingId)return res.status(400).json({error:'Private Tracking ID is required.'});

  try{
    /*
     * Prefer the public SECURITY DEFINER RPC. This works with the normal
     * Supabase publishable key and does not require a Vercel service-role
     * secret just to let a customer track an order.
     */
    const rpc=await supabase('rpc/track_public_order',{
      method:'POST',
      body:JSON.stringify({p_tracking_id:trackingId})
    });
    const rpcData=await json(rpc);

    if(rpc.ok&&rpcData&&typeof rpcData==='object'&&!Array.isArray(rpcData)){
      return res.status(200).json({success:true,order:rpcData});
    }

    /*
     * Backward-compatible fallback for deployments where the new RPC has
     * not been run in Supabase yet, but server credentials are configured.
     */
    const hasServerKey=Boolean(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
    if(hasServerKey){
      const r=await supabase(
        'orders?public_tracking_id=eq.'+encodeURIComponent(trackingId)+
        '&select=id,order_number,public_tracking_id,status,created_at,updated_at,admin_note,tracking_number,tracking_url,tracking_provider'
      );
      const rows=await json(r);
      if(!r.ok||!Array.isArray(rows)||!rows[0]){
        return res.status(404).json({error:'Order not found. Please check your private Tracking ID.'});
      }
      const o=rows[0];
      const legacy=parseLegacyTracking(o.admin_note);
      const tracking={
        number:String(o.tracking_number||legacy.trackingNumber||'').trim(),
        courier:String(o.tracking_provider||legacy.courier||'').trim(),
        url:String(o.tracking_url||legacy.trackingUrl||'').trim()
      };
      const ir=await supabase('order_items?order_id=eq.'+encodeURIComponent(o.id)+'&select=product_name,quantity,unit_price');
      const items=await json(ir);
      return res.status(200).json({
        success:true,
        order:{
          trackingId:o.public_tracking_id,
          orderNumber:o.order_number,
          status:o.status,
          createdAt:o.created_at,
          updatedAt:o.updated_at,
          tracking,
          items:Array.isArray(items)
            ?items.map(x=>({name:x.product_name,quantity:Number(x.quantity||1),price:Number(x.unit_price||0)}))
            :[]
        }
      });
    }

    console.error('Public tracking RPC failed:',rpc.status,rpcData);
    return res.status(500).json({
      error:'Order tracking is not connected yet. Please run the latest supabase.sql in your Supabase SQL Editor.'
    });
  }catch(e){
    console.error('Track order error:',e);
    return res.status(500).json({error:e.message||'Could not load order.'});
  }
};
