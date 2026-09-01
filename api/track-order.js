const {d1Query}=require('./d1-server');

module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});

  const trackingId=String(req.query?.trackingId||'').trim().toUpperCase();
  if(!trackingId)return res.status(400).json({error:'Private Tracking ID is required.'});

  try{
    const orderResult=await d1Query(
      'SELECT id,order_number,public_tracking_id,status,created_at,updated_at,admin_note,tracking_number,tracking_url,tracking_provider FROM orders WHERE upper(public_tracking_id)=upper(?) LIMIT 1',
      [trackingId]
    );
    const o=orderResult.results?.[0];
    if(!o)return res.status(404).json({error:'Order not found. Please check your private Tracking ID.'});

    const itemResult=await d1Query(
      'SELECT product_name,quantity,unit_price FROM order_items WHERE order_id=? ORDER BY id',
      [o.id]
    );
    const items=(itemResult.results||[]).map(x=>({
      name:x.product_name,
      quantity:Number(x.quantity||1),
      price:Number(x.unit_price||0)
    }));

    return res.status(200).json({
      success:true,
      order:{
        trackingId:o.public_tracking_id,
        orderNumber:o.order_number,
        status:o.status,
        createdAt:o.created_at,
        updatedAt:o.updated_at,
        tracking:{
          number:String(o.tracking_number||'').trim(),
          courier:String(o.tracking_provider||'').trim(),
          url:String(o.tracking_url||'').trim()
        },
        items
      }
    });
  }catch(e){
    console.error('Track order error:',e);
    return res.status(500).json({error:e.message||'Could not load order.'});
  }
};
