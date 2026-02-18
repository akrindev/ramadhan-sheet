import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import axios from 'axios';

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

function deriveCsrfUrl(baseUrl: string) {
  try {
    return new URL('/sanctum/csrf-cookie', baseUrl).toString();
  } catch {
    return '';
  }
}

export const GET: RequestHandler = async ({ request, url, platform }) => {
  const nis = url.searchParams.get('nis')?.trim();

  if (!nis) {
    return json({ error: 'Parameter nis wajib diisi' }, { status: 400 });
  }

  if (!platform?.env) {
    return json({ error: 'Runtime environment tidak tersedia' }, { status: 500 });
  }

  const baseUrl = platform.env.IDENTITY_API_URL;
  if (!baseUrl) {
    return json({ error: 'IDENTITY_API_URL belum dikonfigurasi' }, { status: 500 });
  }

  try {
    const csrfUrl = platform.env.IDENTITY_CSRF_URL ?? deriveCsrfUrl(baseUrl);
    const requestOrigin = request.headers.get('origin');
    const requestReferer = request.headers.get('referer');
    const sanctumContextHeaders = {
      ...(requestOrigin ? { Origin: requestOrigin } : {}),
      ...(requestReferer ? { Referer: requestReferer } : {}),
      'X-Requested-With': 'XMLHttpRequest'
    };
    let sanctumHeaders: Record<string, string> = {};

    if (csrfUrl) {
      try {
        const csrfResponse = await axios.get(csrfUrl, {
          headers: {
            Accept: 'application/json',
            ...sanctumContextHeaders
          },
          timeout: 10000
        });

        const cookieHeader = getCookieHeader(
          csrfResponse.headers['set-cookie'] as string | string[] | undefined
        );
        const xsrfToken = getXsrfToken(cookieHeader);

        sanctumHeaders = {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {})
        };
      } catch {
        sanctumHeaders = {};
      }
    }

    const response = await axios.get(baseUrl, {
      params: { nis },
      headers: {
        Accept: 'application/json',
        ...sanctumContextHeaders,
        ...sanctumHeaders
      },
      timeout: 10000
    });

    const payload = response.data;

    if (typeof payload !== 'object' || payload === null) {
      return json({ error: 'Format respons identitas tidak valid' }, { status: 502 });
    }

    if (payload.success !== true) {
      return json({ error: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    const source = payload.data;

    if (typeof source !== 'object' || source === null) {
      return json({ error: 'Format data siswa tidak valid' }, { status: 502 });
    }

    const student = source as {
      fullname?: unknown;
      nipd?: unknown;
      rombel_aktif?: unknown;
    };

    const fullname = typeof student.fullname === 'string' ? student.fullname : '';
    const normalizedNis = typeof student.nipd === 'string' ? student.nipd : nis;

    let rombel = '';
    if (Array.isArray(student.rombel_aktif) && student.rombel_aktif.length > 0) {
      const firstRombel = student.rombel_aktif[0] as { nama?: unknown };
      if (typeof firstRombel.nama === 'string') {
        rombel = firstRombel.nama;
      }
    }

    if (!fullname || !rombel) {
      return json({ error: 'Data siswa belum lengkap pada layanan identitas' }, { status: 502 });
    }

    return json({
      nis: normalizedNis,
      fullname,
      rombel
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 502;
      const errorMessage =
        typeof error.response?.data === 'object' && error.response?.data !== null && 'error' in error.response.data
          ? String(error.response.data.error)
          : status === 401 || status === 419
            ? 'Gagal autentikasi ke layanan identitas (Sanctum/CSRF)'
            : 'Data siswa tidak ditemukan';
      return json({ error: errorMessage }, { status });
    }
    return json({ error: 'Gagal mengambil data dari layanan identitas' }, { status: 502 });
  }
};
