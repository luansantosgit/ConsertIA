// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { encryptWebPushPayload } from '../../../supabase/functions/_shared/push.ts';

/**
 * Teste de regressao do payload Web Push (RFC 8291 aes128gcm).
 *
 * Criptografa com a implementacao de producao
 * (`supabase/functions/_shared/push.ts`) e DECRIPTOGRAFA com uma
 * implementacao independente (HKDF manual + AES-GCM do WebCrypto) —
 * se a ordem salt/ikm do HKDF estiver trocada, o tag AES-GCM nao
 * valida e o navegador descarta a notificacao silenciosamente.
 */

const encoder = new TextEncoder();

function concat(...arrays: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (input.length % 4)) % 4);
  const raw = atob((input + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** HMAC-SHA256 (implementacao manual, independente do HKDF combinado do WebCrypto). */
async function hmac(key: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

/** HKDF-Extract (RFC 5869) */
async function hkdfExtract(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return hmac(salt, ikm);
}

/** HKDF-Expand (RFC 5869) */
async function hkdfExpand(
  prk: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  length: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let t = new Uint8Array(0);
  let counter = 1;
  let total = 0;
  while (total < length) {
    t = await hmac(prk, concat(t, info, new Uint8Array([counter])));
    chunks.push(t);
    total += t.length;
    counter += 1;
  }
  return concat(...chunks).subarray(0, length);
}

async function hkdf(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  length: number,
): Promise<Uint8Array<ArrayBuffer>> {
  return hkdfExpand(await hkdfExtract(salt, ikm), info, length);
}

/** Decripta um payload aes128gcm no lado do "user agent" (navegador). */
async function decryptWebPush(
  ciphertext: Uint8Array<ArrayBuffer>,
  uaPrivateKey: CryptoKey,
  uaPublicKey: Uint8Array<ArrayBuffer>,
  authSecret: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const salt = ciphertext.subarray(0, 16);
  const idlen = ciphertext[20];
  const serverPublic = ciphertext.subarray(21, 21 + idlen);

  const serverKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToB64url(serverPublic.subarray(1, 33)),
      y: bytesToB64url(serverPublic.subarray(33, 65)),
      ext: true,
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: serverKey }, uaPrivateKey, 256),
  );

  const ikm = await hkdf(
    authSecret,
    sharedSecret,
    concat(encoder.encode('WebPush: info\0'), uaPublicKey, serverPublic),
    32,
  );

  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, encoder.encode('Content-Encoding: nonce\0'), 12);

  const body = ciphertext.subarray(21 + idlen);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, body),
  );

  // Ultimo byte = padding delimiter 0x02 (registro unico)
  return new TextDecoder().decode(plaintext.subarray(0, plaintext.length - 1));
}

describe('encryptWebPushPayload (RFC 8291)', () => {
  it('gera um payload que o navegador consegue decifrar', async () => {
    const ua = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    );
    const uaPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
    const authSecret = crypto.getRandomValues(new Uint8Array(16));

    const payload = JSON.stringify({
      title: 'Cliente Teste',
      body: 'Ola, estou precisando de ajuda',
      kind: 'message',
      url: '/atendimento',
    });

    const encrypted = new Uint8Array(await encryptWebPushPayload(payload, {
      endpoint: 'https://fcm.googleapis.com/fcm/send/teste',
      p256dh: bytesToB64url(uaPublicKey),
      auth: bytesToB64url(authSecret),
    }));

    const decrypted = await decryptWebPush(
      encrypted,
      ua.privateKey,
      uaPublicKey,
      authSecret,
    );
    expect(decrypted).toBe(payload);
  });

  it('usa header aes128gcm valido (salt 16, rs 4096, idlen 65)', async () => {
    const ua = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    );
    const uaPublicKey = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
    const authSecret = crypto.getRandomValues(new Uint8Array(16));

    const encrypted = new Uint8Array(await encryptWebPushPayload('teste', {
      endpoint: 'https://fcm.googleapis.com/fcm/send/teste',
      p256dh: bytesToB64url(uaPublicKey),
      auth: bytesToB64url(authSecret),
    }));

    const view = new DataView(encrypted.buffer, encrypted.byteOffset, encrypted.byteLength);
    expect(view.getUint32(16)).toBe(4096); // rs
    expect(view.getUint8(20)).toBe(65); // idlen (ponto EC nao comprimido)
    expect(encrypted[21]).toBe(0x04); // prefixo do ponto EC
    // header (16 + 4 + 1 + 65) + payload + delimitador(1) + tag(16)
    expect(encrypted.length).toBe(86 + 'teste'.length + 1 + 16);
  });

  it('rejeita p256dh invalida em vez de enviar payload quebrado', async () => {
    await expect(
      encryptWebPushPayload('teste', {
        endpoint: 'https://fcm.googleapis.com/fcm/send/teste',
        p256dh: b64urlToBytes('AAAA').length ? 'AAAA' : '',
        auth: 'AAAAAAAAAAAAAAAAAAAAAA',
      }),
    ).rejects.toThrow(/p256dh invalida/);
  });
});
