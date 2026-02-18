/// <reference types="@cloudflare/workers-types" />

declare global {
  namespace App {
    interface Locals {
      teacherSession: {
        token: string;
        userId: string;
        username: string;
        email: string;
        type: number;
        expiresAt: number;
      } | null;
    }

    interface Platform {
      env: {
        DB: D1Database;
        IDENTITY_API_URL: string;
        IDENTITY_CSRF_URL?: string;
        IDENTITY_LOGIN_URL?: string;
      };
      context: {
        waitUntil(promise: Promise<any>): void;
      };
      caches: CacheStorage & { default: Cache };
    }
  }
}

export { };
