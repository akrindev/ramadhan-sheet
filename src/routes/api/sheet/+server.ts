import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const statusPuasaOptions = new Set(['PENUH', 'SETENGAH HARI', 'TIDAK PUASA']);

function getLocaleDateTime(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

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

    const today = getLocaleDateTime();

    if (tanggal > today) {
      return json({
        error: 'Tidak bisa mengisi laporan untuk tanggal di masa depan',
        future: true
      }, { status: 400 });
    }

    const isToday = tanggal === today;
    const existingSheet = await platform.env.DB.prepare(
      'SELECT id FROM sheets WHERE student_id = ? AND tanggal = ?'
    ).bind(studentId, tanggal).first<{ id: number }>();

    if (existingSheet && !isToday) {
      return json({
        error: 'Laporan untuk tanggal yang sudah lewat tidak bisa diubah',
        readonly: true,
        existingDate: tanggal
      }, { status: 409 });
    }

    const alasanValue = status_puasa === 'PENUH' ? null : String(alasan_tidak_puasa).trim();

    if (existingSheet && isToday) {
      await platform.env.DB.prepare(`
        UPDATE sheets SET
          sholat_fardhu = ?, status_puasa = ?, alasan_tidak_puasa = ?,
          ibadah_sunnah = ?, tadarus = ?, kebiasaan = ?, updated_at = unixepoch()
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

      return json({ message: 'Laporan berhasil diperbarui', updated: true });
    }

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
    const nis = url.searchParams.get('nis')?.trim() || '';
    const tanggal = url.searchParams.get('tanggal')?.trim() || '';
    const rombel = url.searchParams.get('rombel')?.trim() || '';
    const dateFrom = url.searchParams.get('date_from')?.trim() || '';
    const dateTo = url.searchParams.get('date_to')?.trim() || '';
    const flat = url.searchParams.get('flat') === '1';
    const rawLimit = Number(url.searchParams.get('limit') || '20');
    const rawOffset = Number(url.searchParams.get('offset') || '0');

    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 200) : 20;
    const offset = Number.isFinite(rawOffset) ? Math.max(Math.floor(rawOffset), 0) : 0;

    if (nis && !flat) {
      const student = await platform.env.DB.prepare(
        'SELECT id, nis, fullname, rombel FROM students WHERE nis = ?'
      ).bind(nis).first<{ id: number; nis: string; fullname: string; rombel: string }>();

      if (!student) {
        return json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
      }

      const sheetConditions: string[] = ['student_id = ?'];
      const sheetBinds: Array<number | string> = [student.id];

      if (tanggal) {
        sheetConditions.push('tanggal = ?');
        sheetBinds.push(tanggal);
      } else {
        if (dateFrom) {
          sheetConditions.push('tanggal >= ?');
          sheetBinds.push(dateFrom);
        }
        if (dateTo) {
          sheetConditions.push('tanggal <= ?');
          sheetBinds.push(dateTo);
        }
      }

      const sheets = await platform.env.DB.prepare(
        `SELECT id, tanggal, sholat_fardhu, status_puasa, alasan_tidak_puasa,
                ibadah_sunnah, tadarus, kebiasaan, created_at
         FROM sheets
         WHERE ${sheetConditions.join(' AND ')}
         ORDER BY tanggal DESC, created_at DESC`
      ).bind(...sheetBinds).all();

      return json({ student: { ...student, sheets: sheets.results } });
    }

    const conditions: string[] = [];
    const binds: string[] = [];

    if (nis) {
      conditions.push('st.nis = ?');
      binds.push(nis);
    }
    if (rombel) {
      conditions.push('st.rombel = ?');
      binds.push(rombel);
    }

    if (tanggal) {
      conditions.push('s.tanggal = ?');
      binds.push(tanggal);
    } else {
      if (dateFrom) {
        conditions.push('s.tanggal >= ?');
        binds.push(dateFrom);
      }
      if (dateTo) {
        conditions.push('s.tanggal <= ?');
        binds.push(dateTo);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const hasFilters = conditions.length > 0;

    let query = `
      SELECT s.id, s.tanggal, s.sholat_fardhu, s.status_puasa, s.alasan_tidak_puasa,
             s.ibadah_sunnah, s.tadarus, s.kebiasaan, s.created_at,
             st.nis, st.fullname, st.rombel
      FROM sheets s
      JOIN students st ON s.student_id = st.id
      ${whereClause}
      ORDER BY s.tanggal DESC, s.created_at DESC
    `;

    query += ' LIMIT ? OFFSET ?';

    const effectiveLimit = flat ? limit : hasFilters ? Math.max(limit, 100) : 100;
    let statement = platform.env.DB.prepare(query);
    statement = statement.bind(...binds, effectiveLimit + 1, offset);

    const result = await statement.all<{
      id: number;
      tanggal: string;
      sholat_fardhu: string;
      status_puasa: string;
      alasan_tidak_puasa: string | null;
      ibadah_sunnah: string;
      tadarus: string;
      kebiasaan: string;
      created_at: string | number;
      nis: string;
      fullname: string;
      rombel: string;
    }>();

    const rows = (result.results || []) as Array<Record<string, unknown>>;
    const hasMore = rows.length > effectiveLimit;
    const sheets = hasMore ? rows.slice(0, effectiveLimit) : rows;

    return json({
      sheets,
      pagination: {
        limit: effectiveLimit,
        offset,
        hasMore,
        nextOffset: offset + sheets.length
      }
    });
  } catch (err) {
    console.error('Get sheets error:', err);
    return json({ error: 'Terjadi kesalahan saat mengambil data' }, { status: 500 });
  }
};
