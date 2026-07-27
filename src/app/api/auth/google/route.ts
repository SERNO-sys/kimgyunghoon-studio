import { NextResponse } from 'next/server';
import { getEnv } from '@/config/env';

export const runtime = 'edge';

export async function GET() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_REDIRECT_URI: redirectUri } =
    getEnv();

  const state = crypto.randomUUID();
  const scope = encodeURIComponent('openid email profile');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
