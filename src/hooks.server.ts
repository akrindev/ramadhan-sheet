import { redirect, type Handle } from '@sveltejs/kit';
import { getTeacherSession } from '$lib/server/teacher-auth';

function isTeacherOnlyApi(pathname: string, method: string) {
  if (pathname === '/api/sheet' && method === 'GET') {
    return true;
  }

  return pathname === '/api/sheet/summary' || pathname === '/api/sheet/rombel';
}

export const handle: Handle = async ({ event, resolve }) => {
  const pathname = event.url.pathname;
  const method = event.request.method.toUpperCase();
  const teacherSession = getTeacherSession(event.cookies);

  event.locals.teacherSession = teacherSession;

  const needsTeacherPage = pathname.startsWith('/laporan') && pathname !== '/laporan/login';
  const needsTeacherApi = isTeacherOnlyApi(pathname, method);

  if (needsTeacherPage && !teacherSession) {
    throw redirect(303, '/laporan/login');
  }

  if (needsTeacherApi && !teacherSession) {
    return new Response(JSON.stringify({ error: 'Akses ditolak. Halaman ini khusus guru.' }), {
      status: 401,
      headers: {
        'content-type': 'application/json'
      }
    });
  }

  if (pathname === '/laporan/login' && teacherSession) {
    throw redirect(303, '/laporan');
  }

  return resolve(event);
};
