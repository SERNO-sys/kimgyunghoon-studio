import { NextResponse } from 'next/server';
import { getEnv } from '@/config/env';
import { setSession } from '@/lib/admin/session';
import { findOrCreateUserFromGoogle } from '@/server/auth/user';

export const runtime = 'edge';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

function getCookieValue(header: string | null, name: string): string | undefined {
  return header
    ?.split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const oauthState = getCookieValue(request.headers.get('cookie'), 'oauth_state');

  if (!code || !state || state !== oauthState) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid_state', request.url));
  }

  const {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_REDIRECT_URI: redirectUri,
  } = getEnv();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/admin/login?error=token_exchange_failed', request.url));
  }

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL('/admin/login?error=user_info_failed', request.url));
  }

  const googleUser = (await userRes.json()) as GoogleUserInfo;
  const user = await findOrCreateUserFromGoogle(googleUser);

  await setSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });

  const response = NextResponse.redirect(new URL('/admin', request.url));
  response.cookies.delete('oauth_state');
  return response;
}
