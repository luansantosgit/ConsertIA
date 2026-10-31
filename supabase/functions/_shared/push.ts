/**
 * Web Push (RFC 8291 + RFC 8292) com Web Crypto nativo do Deno.
 *
 * - JWT VAPID ES256 assinado com a chave privada (curva P-256)
 * - Payload criptografado aes128gcm por subscription
 * - Sem dependencias externas: tudo via crypto.subtle
 *
 * A chave publica VAPID base64url tem 65 bytes: 0x04 || X(32) || Y(32) —
 * dela extraimos x/y para montar o JWK de assinatura.
 */

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const P256_PUB_LEN = 65;
const RECORD_SIZE = 4096;

function b64urlToBytes(input: string): Uint8Array {
  const padding = '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const encoder = new TextEncoder();

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/** Importa a chave privada VAPID (raw d) usando x/y derivados da chave publica. */
async function importVapidPrivateKey(keys: VapidKeys): Promise<CryptoKey> {
  const publicKey = b64urlToBytes(keys.publicKey);
  if (publicKey.length !== P256_PUB_LEN || publicKey[0] !== 0x04) {
    throw new Error('VAPID public key invalida (esperado ponto EC 0x04||X||Y)');
  }
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(publicKey.slice(1, 33)),
    y: bytesToB64url(publicKey.slice(33, 65)),
    d: bytesToB64url(b64urlToBytes(keys.privateKey)),
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/** Gera o header Authorization VAPID (JWT ES256) para o endpoint informado. */
export async function createVapidHeader(
  keys: VapidKeys,
  endpoint: string,
  subject: string,
): Promise<string> {
  const key = await importVapidPrivateKey(keys);
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };
  const signingInput =
    `${bytesToB64url(encoder.encode(JSON.stringify(header)))}.` +
    `${bytesToB64url(encoder.encode(JSON.stringify(payload)))}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(signingInput),
  );
  const jwt = `${signingInput}.${bytesToB64url(new Uint8Array(signature))}`;
  return `vapid t=${jwt}, k=${keys.publicKey}`;
}

/** Criptografa o payload JSON com aes128gcm (RFC 8291) para a subscription. */
export async function encryptWebPushPayload(
  payload: string,
  subscription: PushSubscriptionKeys,
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(subscription.p256dh);
  const uaAuth = b64urlToBytes(subscription.auth);
  if (uaPublic.length !== P256_PUB_LEN || uaPublic[0] !== 0x04) {
    throw new Error('p256dh invalida (esperado ponto EC 0x04||X||Y)');
  }

  const uaKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToB64url(uaPublic.slice(1, 33)),
      y: bytesToB64url(uaPublic.slice(33, 65)),
      ext: true,
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // Par efemerdo do servidor
  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));

  // Shared secret = coordenada X do ponto (32 bytes)
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, serverKeys.privateKey, 256),
  );

  // PRK: HKDF(salt=uaAuth, ikm=ecdh, info="WebPush: info" || 0x00 || uaPublic || asPublic)
  const ikm = await hkdf(
    ecdhSecret,
    uaAuth,
    concat(encoder.encode('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic),
    32,
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentEncodingKey = await hkdf(
    salt,
    ikm,
    concat(encoder.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])),
    16,
  );
  const nonce = await hkdf(
    salt,
    ikm,
    concat(encoder.encode('Content-Encoding: nonce'), new Uint8Array([0])),
    12,
  );

  // Registro unico (rs >= payload+17): plaintext || 0x02 (ultimo registro)
  const plaintext = concat(encoder.encode(payload), new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey('raw', contentEncodingKey, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext),
  );

  // Header aes128gcm: salt(16) || rs(4 BE) || idlen(1) || serverPublic(65)
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = asPublic.length;
  header.set(asPublic, 21);

  return concat(header, ciphertext);
}
