import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getEnv } from '@/config/env';
import { setSessionOnResponse } from '@/lib/admin/session';
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

/**
 * Google OAuth callback.
 *
 * This is the canonical redirect URI used by the app
 * (`GOOGLE_REDIRECT_URI = https://lucidworker.com/api/auth/callback/google`).
 * It must match exactly one of the "Authorized redirect URIs" configured in
 * the Google Cloud Console OAuth client, otherwise Google rejects the request
 * with `redirect_uri_mismatch`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const oauthState = cookieStore.get('oauth_state')?.value;

  if (!code || !state || state !== oauthState) {
    console.error('[oauth/callback/google] invalid_state', {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      cookieState: oauthState,
    });
    return NextResponse.redirect(new URL('/admin/login?error=invalid_state', request.url));
  }

  const {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_REDIRECT_URI: redirectUri,
  } = getEnv();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/admin/login?error=oauth_not_configured', request.url));
  }

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

  const response = NextResponse.redirect(new URL('/admin', request.url));

  // Set the session cookie directly on the response object. In the Edge
  // runtime the `cookies()` API from `next/headers` is read-only, so using
  // `setSession()` here would silently drop the cookie and the user would be
  // bounced back to the login page.
  await setSessionOnResponse(response, {
    userId: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });

  response.cookies.delete('oauth_state');
  return response;
}
