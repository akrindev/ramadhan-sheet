import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform?.env.DB) {
    return json({ error: 'Database tidak tersedia' }, { status: 500 });
  }

  try {
    const tanggal = url.searchParams.get('tanggal')?.trim() || '';
    const dateFrom = url.searchParams.get('date_from')?.trim() || '';
    const dateTo = url.searchParams.get('date_to')?.trim() || '';
    const rombel = url.searchParams.get('rombel')?.trim() || '';

    const joinConditions: string[] = [];
    const binds: string[] = [];

    if (tanggal) {
      joinConditions.push('s.tanggal = ?');
      binds.push(tanggal);
    } else {
      if (dateFrom) {
        joinConditions.push('s.tanggal >= ?');
        binds.push(dateFrom);
      }
      if (dateTo) {
        joinConditions.push('s.tanggal <= ?');
        binds.push(dateTo);
      }
    }

    const joinFilter = joinConditions.length > 0 ? ` AND ${joinConditions.join(' AND ')}` : '';
    const whereClause = rombel ? 'WHERE st.rombel = ?' : '';

    const query = `
      SELECT
        st.rombel,
        COUNT(DISTINCT st.id) as total_siswa,
        COUNT(DISTINCT s.id) as total_laporan,
        COALESCE(ROUND(AVG(CASE
          WHEN s.id IS NOT NULL AND s.status_puasa = 'PENUH' THEN 100.0
          WHEN s.id IS NOT NULL THEN 0
        END), 1), 0) as avg_puasa_penuh,
        COALESCE(ROUND(AVG(CASE
          WHEN s.id IS NOT NULL AND json_array_length(s.sholat_fardhu) = 5 THEN 100.0
          WHEN s.id IS NOT NULL THEN (json_array_length(s.sholat_fardhu) * 100.0 / 5)
        END), 1), 0) as avg_sholat,
        COALESCE(ROUND(AVG(CASE
          WHEN s.id IS NOT NULL AND s.tadarus IS NOT NULL AND s.tadarus != '' THEN 100.0
          WHEN s.id IS NOT NULL THEN 0
        END), 1), 0) as avg_tadarus
      FROM students st
      LEFT JOIN sheets s ON st.id = s.student_id${joinFilter}
      ${whereClause}
      GROUP BY st.rombel
      ORDER BY st.rombel
    `;

    let statement = platform.env.DB.prepare(query);
    if (rombel) {
      statement = statement.bind(...binds, rombel);
    } else if (binds.length > 0) {
      statement = statement.bind(...binds);
    }

    const result = await statement.all();

    return json({ summary: result.results });
  } catch (err) {
    console.error('Get summary error:', err);
    return json({ error: 'Terjadi kesalahan saat mengambil data ringkasan' }, { status: 500 });
  }
};
