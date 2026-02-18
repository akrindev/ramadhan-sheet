import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { clearTeacherSession } from '$lib/server/teacher-auth';

export const POST: RequestHandler = async ({ cookies }) => {
  clearTeacherSession(cookies);
  return json({ message: 'Logout berhasil' });
};
