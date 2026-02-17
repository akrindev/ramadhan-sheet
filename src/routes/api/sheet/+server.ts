import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const statusPuasaOptions = new Set(['PENUH', 'SETENGAH HARI', 'TIDAK PUASA']);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform?.env.DB) {
    return json({ error: 'Database tidak tersedia' }, { status: 500 });
  }

  try {
    const data: unknown = await request.json();
    if (typeof data !== 'object' || data === null) {
      return json({ error: 'Payload tidak valid' }, { status: 400 });
    }

    const {
      nis,
      fullname,
      rombel,
      tanggal,
      sholat_fardhu,
      status_puasa,
      alasan_tidak_puasa,
      ibadah_sunnah,
      tadarus,
      kebiasaan
    } = data as Record<string, unknown>;

    if (
      typeof nis !== 'string' ||
      typeof fullname !== 'string' ||
      typeof rombel !== 'string' ||
      typeof tanggal !== 'string' ||
      typeof status_puasa !== 'string' ||
      typeof tadarus !== 'string' ||
      !isStringArray(sholat_fardhu) ||
      !isStringArray(ibadah_sunnah) ||
      !isStringArray(kebiasaan)
    ) {
      return json({ error: 'Data laporan tidak lengkap atau tidak sesuai format' }, { status: 400 });
    }

    if (!statusPuasaOptions.has(status_puasa)) {
      return json({ error: 'Status puasa tidak valid' }, { status: 400 });
    }

    // Find or create student using raw D1
    const existingStudent = await platform.env.DB.prepare(
      'SELECT id FROM students WHERE nis = ?'
    ).bind(nis.trim()).first<{ id: number }>();

    let studentId: number;

    if (existingStudent) {
      studentId = existingStudent.id;
      // Update student info if needed
      await platform.env.DB.prepare(
        'UPDATE students SET fullname = ?, rombel = ?, updated_at = unixepoch() WHERE id = ?'
      ).bind(fullname.trim(), rombel.trim(), studentId).run();
    } else {
      // Insert new student
      const result = await platform.env.DB.prepare(
        'INSERT INTO students (nis, fullname, rombel, created_at, updated_at) VALUES (?, ?, ?, unixepoch(), unixepoch()) RETURNING id'
      ).bind(nis.trim(), fullname.trim(), rombel.trim()).first<{ id: number }>();
      
      if (!result) {
        return json({ error: 'Gagal menyimpan data siswa' }, { status: 500 });
      }
      studentId = result.id;
    }

    // Upsert sheet using raw D1
    const existingSheet = await platform.env.DB.prepare(
      'SELECT id FROM sheets WHERE student_id = ? AND tanggal = ?'
    ).bind(studentId, tanggal).first<{ id: number }>();

    const alasanValue = status_puasa === 'PENUH' ? null : String(alasan_tidak_puasa).trim();

    if (existingSheet) {
      await platform.env.DB.prepare(`
        UPDATE sheets SET 
          sholat_fardhu = ?, 
          status_puasa = ?, 
          alasan_tidak_puasa = ?, 
          ibadah_sunnah = ?, 
          tadarus = ?, 
          kebiasaan = ?,
          updated_at = unixepoch()
        WHERE id = ?
      `).bind(
        JSON.stringify(sholat_fardhu),
        status_puasa,
        alasanValue,
        JSON.stringify(ibadah_sunnah),
        tadarus.trim(),
        JSON.stringify(kebiasaan),
        existingSheet.id
      ).run();
    } else {
      await platform.env.DB.prepare(`
        INSERT INTO sheets (
          student_id, tanggal, sholat_fardhu, status_puasa, 
          alasan_tidak_puasa, ibadah_sunnah, tadarus, kebiasaan,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
      `).bind(
        studentId,
        tanggal,
        JSON.stringify(sholat_fardhu),
        status_puasa,
        alasanValue,
        JSON.stringify(ibadah_sunnah),
        tadarus.trim(),
        JSON.stringify(kebiasaan)
      ).run();
    }

    return json({ message: 'Laporan berhasil disimpan' });
  } catch (err) {
    console.error('Sheet error:', err);
    return json({ error: 'Terjadi kesalahan saat menyimpan laporan' }, { status: 500 });
  }
};

// GET endpoint to retrieve sheets with student info
export const GET: RequestHandler = async ({ url, platform }) => {
  if (!platform?.env.DB) {
    return json({ error: 'Database tidak tersedia' }, { status: 500 });
  }

  try {
    const nis = url.searchParams.get('nis');
    const tanggal = url.searchParams.get('tanggal');
    const rombel = url.searchParams.get('rombel');

    if (nis) {
      // Get sheets for specific student with student info
      const student = await platform.env.DB.prepare(
        'SELECT id, nis, fullname, rombel FROM students WHERE nis = ?'
      ).bind(nis).first<{ id: number; nis: string; fullname: string; rombel: string }>();

      if (!student) {
        return json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
      }

      const sheets = await platform.env.DB.prepare(
        `SELECT id, tanggal, sholat_fardhu, status_puasa, alasan_tidak_puasa, 
                ibadah_sunnah, tadarus, kebiasaan, created_at 
         FROM sheets WHERE student_id = ? ORDER BY tanggal DESC`
      ).bind(student.id).all();

      return json({ student: { ...student, sheets: sheets.results } });
    }

    if (rombel && tanggal) {
      // Get all sheets for specific rombel and tanggal with student info using JOIN
      const result = await platform.env.DB.prepare(`
        SELECT s.id, s.tanggal, s.sholat_fardhu, s.status_puasa, s.alasan_tidak_puasa,
               s.ibadah_sunnah, s.tadarus, s.kebiasaan, s.created_at,
               st.nis, st.fullname, st.rombel
        FROM sheets s
        JOIN students st ON s.student_id = st.id
        WHERE st.rombel = ? AND s.tanggal = ?
        ORDER BY s.created_at DESC
      `).bind(rombel, tanggal).all();

      return json({ sheets: result.results });
    }

    if (tanggal) {
      // Get all sheets for specific date with student info using JOIN
      const result = await platform.env.DB.prepare(`
        SELECT s.id, s.tanggal, s.sholat_fardhu, s.status_puasa, s.alasan_tidak_puasa,
               s.ibadah_sunnah, s.tadarus, s.kebiasaan, s.created_at,
               st.nis, st.fullname, st.rombel
        FROM sheets s
        JOIN students st ON s.student_id = st.id
        WHERE s.tanggal = ?
        ORDER BY s.created_at DESC
      `).bind(tanggal).all();

      return json({ sheets: result.results });
    }

    // Get all recent sheets (limited) with student info
    const result = await platform.env.DB.prepare(`
      SELECT s.id, s.tanggal, s.sholat_fardhu, s.status_puasa, s.alasan_tidak_puasa,
             s.ibadah_sunnah, s.tadarus, s.kebiasaan, s.created_at,
             st.nis, st.fullname, st.rombel
      FROM sheets s
      JOIN students st ON s.student_id = st.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `).all();

    return json({ sheets: result.results });
  } catch (err) {
    console.error('Get sheets error:', err);
    return json({ error: 'Terjadi kesalahan saat mengambil data' }, { status: 500 });
  }
};
