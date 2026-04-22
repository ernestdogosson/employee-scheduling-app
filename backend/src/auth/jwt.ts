import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN ?? "1h";

if (!secret) {
  throw new Error("JWT_SECRET is not set");
}

export type AuthTokenPayload = {
  sub: number;
  role: "EMPLOYER" | "EMPLOYEE";
};

// sign a new token for a logged-in user
export function signToken(payload: AuthTokenPayload): string {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, secret as string, options);
}

// verify token and return its payload, or throw
export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, secret as string);
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as unknown as AuthTokenPayload;
}
