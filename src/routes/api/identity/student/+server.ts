import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
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

  const endpoint = new URL(baseUrl);
  endpoint.searchParams.set('nis', nis);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    const payload: unknown = await response.json();

    if (!response.ok) {
      const error =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String((payload as { error: unknown }).error)
          : 'Data siswa tidak ditemukan';
      return json({ error }, { status: response.status });
    }

    if (typeof payload !== 'object' || payload === null) {
      return json({ error: 'Format respons identitas tidak valid' }, { status: 502 });
    }

    const payloadObj = payload as { success?: unknown; data?: unknown };

    if (payloadObj.success !== true) {
      return json({ error: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    const source = payloadObj.data;

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
  } catch {
    return json({ error: 'Gagal mengambil data dari layanan identitas' }, { status: 502 });
  }
};
