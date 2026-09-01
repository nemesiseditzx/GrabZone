const crypto = require("crypto");

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function encodePath(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function cleanName(name) {
  const ext = String(name || "").split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  return ext;
}

async function requireAdmin(req) {
  const auth=String(req.headers.authorization||'');
  const bearer=auth.startsWith('Bearer ')?auth.slice(7).trim():'';
  const secret=process.env.D1_AUTH_SECRET||process.env.CF_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN||process.env.CLOUDFLARE_API_KEY||'';
  if(bearer&&secret){
    const parts=bearer.split('.');
    if(parts.length===2){
      const expected=crypto.createHmac('sha256',secret).update(parts[0]).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
      const a=Buffer.from(parts[1]),b=Buffer.from(expected);
      if(a.length===b.length&&crypto.timingSafeEqual(a,b)){
        try{
          const payload=JSON.parse(Buffer.from(parts[0].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'));
          if(payload?.sub&&Number(payload.exp||0)>Math.floor(Date.now()/1000))return payload;
        }catch{}
      }
    }
  }

  const cookie = String(req.headers.cookie || '');
  const token = cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('gz_admin_session='))?.slice('gz_admin_session='.length) || '';
  const account=process.env.R2_ACCOUNT_ID||process.env.CF_ACCOUNT_ID||process.env.CLOUDFLARE_ACCOUNT_ID;
  const database=process.env.D1_DATABASE_ID||process.env.CLOUDFLARE_D1_DATABASE_ID||'ffaa2c49-c89e-439f-9a71-89144b07dfce';
  const cfToken=process.env.CF_API_TOKEN||process.env.CLOUDFLARE_API_TOKEN||process.env.CLOUDFLARE_API_KEY;
  if(token && account && database && cfToken){
    const tokenHash=crypto.createHash('sha256').update(decodeURIComponent(token)).digest('hex');
    const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{
      method:'POST',headers:{Authorization:`Bearer ${cfToken}`,'Content-Type':'application/json'},
      body:JSON.stringify({sql:`SELECT u.id,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1`,params:[tokenHash,new Date().toISOString()]})
    });
    const body=await response.json().catch(()=>({}));
    const user=body?.result?.[0]?.results?.[0];
    if(response.ok&&body.success!==false&&user?.id)return user;
  }
  throw new Error('Admin session is invalid or expired.');
}  throw new Error('Admin session is invalid or expired.');
}


function presignPut(key, contentType) {
  const region = "auto";
  const service = "s3";
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").replace("Z", "Z");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalUri = `/${encodePath(R2_BUCKET_NAME)}/${encodePath(key)}`;
  const params = new URLSearchParams();
  params.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  params.set("X-Amz-Credential", `${R2_ACCESS_KEY_ID}/${credentialScope}`);
  params.set("X-Amz-Date", amzDate);
  params.set("X-Amz-Expires", "900");
  params.set("X-Amz-SignedHeaders", "content-type;host");

  const canonicalQuery = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = "content-type;host";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");

  const kDate = hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  params.set("X-Amz-Signature", signature);

  return {
    uploadUrl: `https://${host}${canonicalUri}?${params.toString()}`,
    publicUrl: `${R2_PUBLIC_BASE_URL}/${key.split("/").map(encodeURIComponent).join("/")}`
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    await requireAdmin(req);

    if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_BASE_URL) {
      return res.status(500).json({
        error: "R2 is not configured. Add R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_PUBLIC_BASE_URL in Vercel."
      });
    }

    const { filename, contentType } = req.body || {};
    const safeType = String(contentType || "").toLowerCase();

    if (!/^image\/(jpeg|png|webp|gif|avif|svg\+xml)$/.test(safeType)) {
      return res.status(400).json({ error: "Only image files are allowed." });
    }

    const ext = cleanName(filename);
    const key = `uploads/${crypto.randomUUID()}.${ext}`;
    const signed = presignPut(key, safeType);

    return res.status(200).json({ ...signed, key });
  } catch (error) {
    console.error("R2 presign error:", error);
    return res.status(401).json({ error: error.message || "Could not prepare R2 upload." });
  }
}
