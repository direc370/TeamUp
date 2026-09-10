import { createHmac } from 'crypto'

function b64url(input: Buffer | string) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64url')
}

export function signHs256(
  payload: Record<string, unknown>,
  secret: string,
  options: { expiresInSec: number; issuer: string; audience: string; issuedAtSec?: number },
) {
  const iat = options.issuedAtSec ?? Math.floor(Date.now() / 1000)
  const body = { ...payload, iat, exp: iat + options.expiresInSec, iss: options.issuer, aud: options.audience }
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const data = `${header}.${b64url(JSON.stringify(body))}`
  const sig = b64url(createHmac('sha256', secret).update(data).digest())
  return `${data}.${sig}`
}

export function verifyHs256(token: string, secret: string, issuer: string, audience: string): { sub: string } {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('malformed')
  const data = `${parts[0]}.${parts[1]}`
  const expected = b64url(createHmac('sha256', secret).update(data).digest())
  if (expected !== parts[2]) throw new Error('bad signature')
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as {
    sub?: unknown
    exp?: number
    iss?: string
    aud?: string
  }
  if (payload.iss !== issuer || payload.aud !== audience) throw new Error('aud/iss')
  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('expired')
  if (typeof payload.sub !== 'string') throw new Error('sub')
  return { sub: payload.sub }
}
