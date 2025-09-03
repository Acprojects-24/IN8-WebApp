// Simple HS256 JWT signer for admin tokens (dev/demo only)

const textEncoder = new TextEncoder();

function bytesToBinaryString(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return s;
}

function base64UrlEncode(input) {
  if (typeof input === 'string') {
    const utf8 = textEncoder.encode(input);
    return base64UrlEncode(utf8);
  }
  const b64 = btoa(bytesToBinaryString(input));
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function hmacSha256(keyBytes, dataBytes) {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    throw new Error('WebCrypto.subtle not available. Use HTTPS or localhost.');
  }
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, dataBytes);
  return new Uint8Array(sig);
}

export async function createAdminJwt({ name, email, avatar, expiresInSec = 3600 }) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const nbf = iat - 1;
  const exp = iat + expiresInSec;
  const payload = {
    aud: 'meet99',
    iss: 'meet99',
    sub: '*',
    room: '*',
    iat,
    nbf,
    exp,
    context: {
      user: {
        name: name || 'Admin',
        email: email || '',
        avatar: avatar || ''
      }
    }
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const toSign = textEncoder.encode(`${headerB64}.${payloadB64}`);
  // WARNING: For production, DO NOT hardcode secrets client-side. Move signing server-side.
  const appSecret = textEncoder.encode('meet999');
  const signature = await hmacSha256(appSecret, toSign);
  const sigB64 = base64UrlEncode(signature);
  return `${headerB64}.${payloadB64}.${sigB64}`;
}


