import type { Cookies } from '@sveltejs/kit';

export const TEACHER_SESSION_COOKIE = 'teacher_session';

const SESSION_TTL_SECONDS = 60 * 60 * 8;

type TeacherSessionPayload = {
  token: string;
  userId: string;
  username: string;
  email: string;
  type: number;
  expiresAt: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function parseSessionCookie(raw: string | undefined): TeacherSessionPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const decoded = fromBase64Url(raw);
    const parsed = JSON.parse(decoded) as unknown;

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const candidate = parsed as Partial<TeacherSessionPayload>;

    if (
      typeof candidate.token !== 'string' ||
      typeof candidate.userId !== 'string' ||
      typeof candidate.username !== 'string' ||
      typeof candidate.email !== 'string' ||
      typeof candidate.type !== 'number' ||
      typeof candidate.expiresAt !== 'number'
    ) {
      return null;
    }

    return candidate as TeacherSessionPayload;
  } catch {
    return null;
  }
}

export function getTeacherSession(cookies: Cookies): TeacherSessionPayload | null {
  const parsed = parseSessionCookie(cookies.get(TEACHER_SESSION_COOKIE));
  if (!parsed) {
    return null;
  }

  if (parsed.expiresAt <= Date.now()) {
    return null;
  }

  if (parsed.type !== 1) {
    return null;
  }

  return parsed;
}

export function setTeacherSession(
  cookies: Cookies,
  payload: {
    token: string;
    userId: string;
    username: string;
    email: string;
    type: number;
  }
) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;

  const value = toBase64Url(
    JSON.stringify({
      token: payload.token,
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      type: payload.type,
      expiresAt
    })
  );

  cookies.set(TEACHER_SESSION_COOKIE, value, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS
  });
}

export function clearTeacherSession(cookies: Cookies) {
  cookies.delete(TEACHER_SESSION_COOKIE, {
    path: '/'
  });
}
