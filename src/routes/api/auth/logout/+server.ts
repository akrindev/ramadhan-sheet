import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';
import { clearTeacherSession } from '$lib/server/teacher-auth';

function deriveUrl(baseUrl: string, path: string) {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return '';
  }
}

export const POST: RequestHandler = async ({ cookies, locals, platform }) => {
  const session = locals.teacherSession;

  const loginUrl = platform?.env.IDENTITY_LOGIN_URL;
  const identityApiUrl = platform?.env.IDENTITY_API_URL;
  const logoutUrl =
    platform?.env.IDENTITY_LOGOUT_URL ??
    (loginUrl ? deriveUrl(loginUrl, '/assembly-logout') : identityApiUrl ? deriveUrl(identityApiUrl, '/assembly-logout') : '');

  if (session?.token && logoutUrl) {
    try {
      await axios.post(
        logoutUrl,
        {},
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${session.token}`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 10000
        }
      );
    } catch (error) {
      console.error('Remote assembly logout failed:', error);
    }
  }

  clearTeacherSession(cookies);
  return json({ message: 'Logout berhasil' });
};
