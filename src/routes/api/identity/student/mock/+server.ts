import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const mockStudents = new Map([
  ['12345', { nis: '12345', fullname: 'Ahmad Rizky', rombel: 'XII TKJ 1' }],
  ['67890', { nis: '67890', fullname: 'Siti Aminah', rombel: 'XI RPL 2' }],
  ['11111', { nis: '11111', fullname: 'Budi Santoso', rombel: 'X AKL 1' }],
  ['22222', { nis: '22222', fullname: 'Dewi Lestari', rombel: 'XII MM 2' }],
  ['125261', { nis: '125261', fullname: 'Rina Amelia', rombel: 'XII TKJ 2' }],
]);

export const GET: RequestHandler = async ({ url }) => {
  const nis = url.searchParams.get('nis')?.trim();

  if (!nis) {
    return json({ error: 'Parameter nis wajib diisi' }, { status: 400 });
  }

  const student = mockStudents.get(nis);

  if (!student) {
    return json({ error: 'Siswa tidak ditemukan' }, { status: 404 });
  }

  return json(student);
};
