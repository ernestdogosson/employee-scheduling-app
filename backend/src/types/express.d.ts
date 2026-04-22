import type { AuthTokenPayload } from "../auth/jwt.ts";

// add user field to express's Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export {};
