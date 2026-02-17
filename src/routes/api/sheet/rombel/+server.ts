import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  if (!platform?.env.DB) {
    return json({ error: 'Database tidak tersedia' }, { status: 500 });
  }

  try {
    const result = await platform.env.DB.prepare(
      'SELECT DISTINCT rombel FROM students ORDER BY rombel'
    ).all<{ rombel: string }>();

    const rombel = (result.results || []).map(r => r.rombel);
    return json({ rombel });
  } catch (err) {
    console.error('Get rombel error:', err);
    return json({ error: 'Terjadi kesalahan saat mengambil data rombel' }, { status: 500 });
  }
};
