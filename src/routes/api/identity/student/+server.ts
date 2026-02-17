import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import axios from 'axios';

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

  try {
    const response = await axios.get(baseUrl, {
      params: { nis },
      headers: {
        Accept: 'application/json'
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
      const errorMessage = 
        typeof error.response?.data === 'object' && error.response?.data !== null && 'error' in error.response.data
          ? String(error.response.data.error)
          : 'Data siswa tidak ditemukan';
      return json({ error: errorMessage }, { status: error.response?.status || 502 });
    }
    return json({ error: 'Gagal mengambil data dari layanan identitas' }, { status: 502 });
  }
};
