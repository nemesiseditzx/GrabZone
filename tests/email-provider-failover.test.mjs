import test from 'node:test';
import assert from 'node:assert/strict';
import { sendEmailWithFallback, configuredEmailProviderOrder, sendCustomerOrderConfirmation } from '../grabzone-email.mjs';

const response=(status,body={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});

test('transactional email uses Brevo when Resend definitively rate-limits',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url,init={})=>{
    calls.push({url:String(url),init});
    if(String(url)==='https://api.resend.com/emails')return response(429,{message:'rate limited'});
    if(String(url)==='https://api.brevo.com/v3/smtp/email')return response(201,{messageId:'brevo-message-1'});
    throw new Error('Unexpected provider '+url);
  };
  try{
    const result=await sendEmailWithFallback({RESEND_API_KEY:'test-resend',BREVO_API_KEY:'test-brevo',BREVO_FROM_EMAIL:'support@example.test',EMAIL_PROVIDER_ORDER:'resend,brevo'},{
      to:'customer@example.test',subject:'Order received',html:'<p>Order</p>',text:'Order'
    });
    assert.equal(result.ok,true);
    assert.equal(result.provider,'brevo');
    assert.equal(result.id,'brevo-message-1');
    assert.deepEqual(result.attempts.map(x=>x.outcome),['rejected','accepted']);
    assert.equal(calls.length,2);
    assert.equal(calls[1].init.headers['api-key'],'test-brevo');
  }finally{globalThis.fetch=original;}
});

test('ambiguous Resend server failure stops failover to avoid duplicate email',async()=>{
  const original=globalThis.fetch;
  const calls=[];
  globalThis.fetch=async(url)=>{
    calls.push(String(url));
    return response(503,{message:'temporary error'});
  };
  try{
    const result=await sendEmailWithFallback({RESEND_API_KEY:'test-resend',BREVO_API_KEY:'test-brevo',BREVO_FROM_EMAIL:'support@example.test',EMAIL_PROVIDER_ORDER:'resend,brevo'},{
      to:'customer@example.test',subject:'Order received',html:'<p>Order</p>',text:'Order'
    });
    assert.equal(result.ok,false);
    assert.equal(result.provider,'resend');
    assert.equal(result.definitive,false);
    assert.equal(calls.length,1);
    assert.equal(result.attempts[0].outcome,'ambiguous');
  }finally{globalThis.fetch=original;}
});

test('provider order is configurable per email category and deduplicated',()=>{
  assert.deepEqual(configuredEmailProviderOrder({
    EMAIL_PROVIDER_ORDER:'resend,brevo,resend,unknown',
    EMAIL_PROVIDER_ORDER_TRANSACTIONAL:'brevo,mailtrap,brevo'
  }),['brevo','mailtrap']);
  assert.deepEqual(configuredEmailProviderOrder({EMAIL_PROVIDER_ORDER:'unknown'}),['resend','brevo','mailtrap','gmail']);
});

test('customer order confirmation can use Brevo when Resend is not configured',async()=>{
  const original=globalThis.fetch;
  let call;
  globalThis.fetch=async(url,init={})=>{
    call={url:String(url),init,body:JSON.parse(init.body)};
    return response(201,{messageId:'customer-mail-1'});
  };
  try{
    const result=await sendCustomerOrderConfirmation({
      BREVO_API_KEY:'test-brevo',
      BREVO_FROM_EMAIL:'orders@example.test',
      EMAIL_PROVIDER_ORDER_TRANSACTIONAL:'brevo'
    },{
      to:'customer@example.test',customerName:'Customer',orderNumber:'GZ-100',
      items:[{product_name:'Test product',quantity:1,unit_price:100,line_total:100}],
      subtotal:100,shipping:10,total:110,tracking:'track-100'
    });
    assert.equal(result.ok,true);
    assert.equal(result.provider,'brevo');
    assert.equal(call.url,'https://api.brevo.com/v3/smtp/email');
    assert.match(call.body.subject,/GZ-100/);
    assert.match(call.body.htmlContent,/Cash on Delivery/);
    assert.equal(call.body.to[0].email,'customer@example.test');
  }finally{globalThis.fetch=original;}
});
