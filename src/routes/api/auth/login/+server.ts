import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import { setTeacherSession } from '$lib/server/teacher-auth';

function getCookieHeader(setCookieHeader: string | string[] | undefined) {
  if (!setCookieHeader) {
    return '';
  }

  const cookieEntries = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader.split(/,(?=[^;]+=[^;]+)/g);

  return cookieEntries
    .map((cookie) => cookie.split(';', 1)[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie))
    .join('; ');
}

function getXsrfToken(cookieHeader: string) {
  if (!cookieHeader) {
    return '';
  }

  const xsrfCookie = cookieHeader
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='));

  if (!xsrfCookie) {
    return '';
  }

  return decodeURIComponent(xsrfCookie.replace('XSRF-TOKEN=', ''));
}

function deriveUrl(baseUrl: string, path: string) {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return '';
  }
}

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  if (!platform?.env) {
    return json({ error: 'Runtime environment tidak tersedia' }, { status: 500 });
  }

  const identityApiUrl = platform.env.IDENTITY_API_URL;
  if (!identityApiUrl) {
    return json({ error: 'IDENTITY_API_URL belum dikonfigurasi' }, { status: 500 });
  }

  const body = (await request.json()) as { identifier?: unknown; password?: unknown };
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identifier || !password) {
    return json({ error: 'Email/username dan password wajib diisi' }, { status: 400 });
  }

  const csrfUrl = platform.env.IDENTITY_CSRF_URL ?? deriveUrl(identityApiUrl, '/sanctum/csrf-cookie');
  const loginUrl = platform.env.IDENTITY_LOGIN_URL ?? deriveUrl(identityApiUrl, '/assembly-login');

  if (!loginUrl) {
    return json({ error: 'Endpoint login tidak valid' }, { status: 500 });
  }

  try {
    let sanctumHeaders: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (csrfUrl) {
      const csrfResponse = await axios.get(csrfUrl, {
        headers: {
          Accept: 'application/json',
          ...sanctumHeaders
        },
        timeout: 10000
      });

      const cookieHeader = getCookieHeader(
        csrfResponse.headers['set-cookie'] as string | string[] | undefined
      );
      const xsrfToken = getXsrfToken(cookieHeader);

      sanctumHeaders = {
        ...sanctumHeaders,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {})
      };
    }

    const response = await axios.post(
      loginUrl,
      {
        email: identifier,
        username: identifier,
        password
      },
      {
        headers: {
          Accept: 'application/json',
          ...sanctumHeaders
        },
        timeout: 10000
      }
    );

    const payload = response.data as {
      token?: unknown;
      user?: {
        id?: unknown;
        username?: unknown;
        email?: unknown;
        type?: unknown;
      };
    };

    const token = typeof payload.token === 'string' ? payload.token : '';
    const userId = typeof payload.user?.id === 'string' ? payload.user.id : '';
    const username = typeof payload.user?.username === 'string' ? payload.user.username : '';
    const email = typeof payload.user?.email === 'string' ? payload.user.email : '';
    const type = typeof payload.user?.type === 'number' ? payload.user.type : Number.NaN;

    if (!token || !userId || !username || !email || Number.isNaN(type)) {
      return json({ error: 'Respons login tidak valid dari backend' }, { status: 502 });
    }

    if (type !== 1) {
      return json({ error: 'Akses ditolak. Halaman laporan hanya untuk guru.' }, { status: 403 });
    }

    setTeacherSession(cookies, {
      token,
      userId,
      username,
      email,
      type
    });

    return json({
      message: 'Login berhasil',
      teacher: {
        username,
        email
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 502;
      const errorMessage =
        typeof error.response?.data === 'object' &&
        error.response?.data !== null &&
        'message' in error.response.data
          ? String(error.response.data.message)
          : 'Login gagal. Periksa email/username dan password.';

      return json({ error: errorMessage }, { status });
    }

    return json({ error: 'Gagal menghubungi layanan autentikasi' }, { status: 502 });
  }
};
