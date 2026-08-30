const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
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
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing admin session.");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase server authentication is not configured.");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: auth,
      apikey: SUPABASE_ANON_KEY
    }
  });

  if (!response.ok) throw new Error("Admin session is invalid or expired.");

  const user = await response.json();
  if (!user?.id) throw new Error("Admin session is invalid.");
  return user;
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
