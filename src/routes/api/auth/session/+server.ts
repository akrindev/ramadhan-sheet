import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.teacherSession) {
    return json({ authenticated: false }, { status: 401 });
  }

  return json({
    authenticated: true,
    teacher: {
      username: locals.teacherSession.username,
      email: locals.teacherSession.email
    }
  });
};
