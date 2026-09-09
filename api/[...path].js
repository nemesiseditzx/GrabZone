const UPSTREAM = 'https://grabzone-marketplace-dev.nemesiseditzx984.workers.dev';

const SKIP_REQUEST_HEADERS = new Set(['host', 'content-length', 'connection']);
const SKIP_RESPONSE_HEADERS = new Set(['content-length', 'connection', 'transfer-encoding']);

function requestHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (SKIP_REQUEST_HEADERS.has(key.toLowerCase()) || value == null) continue;
    if (Array.isArray(value)) headers.set(key, value.join(', '));
    else headers.set(key, String(value));
  }
  return headers;
}

export default async function handler(req, res) {
  const path = String(req.url || '/api').replace(/^\/api/, '') || '/';
  const target = new URL(path, UPSTREAM);
  try {
    const headers = requestHeaders(req);
    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (req.body !== undefined && req.body !== null) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      else { const chunks=[]; for await (const chunk of req) chunks.push(Buffer.from(chunk)); body=chunks.length?Buffer.concat(chunks):undefined; }
    }
    const upstream = await fetch(target,{method:req.method,headers,body,redirect:'manual'});
    for(const [key,value] of upstream.headers.entries()){if(SKIP_RESPONSE_HEADERS.has(key.toLowerCase())||key.toLowerCase()==='set-cookie')continue;res.setHeader(key,value)}
    const cookies=typeof upstream.headers.getSetCookie==='function'?upstream.headers.getSetCookie():null;if(cookies?.length)res.setHeader('set-cookie',cookies);
    res.status(upstream.status);if(req.method==='HEAD')return res.end();return res.end(Buffer.from(await upstream.arrayBuffer()));
  }catch(error){return res.status(502).json({error:'Marketplace backend unavailable.',detail:error?.message||'Upstream request failed.'})}
}
