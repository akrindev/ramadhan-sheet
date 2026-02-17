import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform?.env.DB) {
    return json({ error: 'Database tidak tersedia' }, { status: 500 });
  }

  try {
    const tanggal = url.searchParams.get('tanggal');

    let query = `
      SELECT 
        st.rombel,
        COUNT(DISTINCT st.id) as total_siswa,
        COUNT(DISTINCT s.id) as total_laporan,
        ROUND(AVG(CASE WHEN s.status_puasa = 'PENUH' THEN 100.0 ELSE 0 END), 1) as avg_puasa_penuh,
        ROUND(AVG(CASE WHEN json_array_length(s.sholat_fardhu) = 5 THEN 100.0 ELSE 
          (json_array_length(s.sholat_fardhu) * 100.0 / 5) END), 1) as avg_sholat,
        ROUND(AVG(CASE WHEN s.tadarus IS NOT NULL AND s.tadarus != '' THEN 100.0 ELSE 0 END), 1) as avg_tadarus
      FROM students st
      LEFT JOIN sheets s ON st.id = s.student_id
    `;

    if (tanggal) {
      query += ` WHERE s.tanggal = ?`;
    }

    query += ` GROUP BY st.rombel ORDER BY st.rombel`;

    let statement = platform.env.DB.prepare(query);

    if (tanggal) {
      statement = statement.bind(tanggal);
    }

    const result = await statement.all();

    return json({ summary: result.results });
  } catch (err) {
    console.error('Get summary error:', err);
    return json({ error: 'Terjadi kesalahan saat mengambil data ringkasan' }, { status: 500 });
  }
};
