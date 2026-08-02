import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { getEnv, getSessionSecret } from '@/config/env';
import type { AdminSession } from '@/types/admin';

const SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function sign(value: string): Promise<string> {
  const secret = getSessionSecret();
  // If no session secret is configured, produce a signature that can never
  // match a real one so verification simply fails instead of crashing.
  if (!secret) {
    return 'unconfigured';
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifySession(value: string): Promise<AdminSession | null> {
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = await sign(payload);
  if (signature !== expected) return null;
  try {
    const session = JSON.parse(fromBase64(payload)) as AdminSession;
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

async function signSession(session: AdminSession): Promise<string> {
  const payload = toBase64(JSON.stringify(session));
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return verifySession(value);
}

export async function getSessionFromRequest(request: NextRequest): Promise<AdminSession | null> {
  const value = request.cookies.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return verifySession(value);
}

export async function setSession(session: AdminSession): Promise<void> {
  const cookieStore = await cookies();
  const signed = await signSession(session);
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

/**
 * Signs the session and sets the cookie directly on a NextResponse object.
 *
 * This is the correct way to set the session cookie from an Edge-runtime Route
 * Handler (e.g. the OAuth callback). In the Edge runtime the `cookies()` API
 * from `next/headers` is read-only, so mutations via `setSession()` are
 * silently ignored and the cookie never reaches the browser. Setting it on the
 * response object guarantees the `Set-Cookie` header is attached.
 */
export async function setSessionOnResponse(
  response: NextResponse,
  session: AdminSession
): Promise<void> {
  const signed = await signSession(session);
  response.cookies.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
