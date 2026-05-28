import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type TokenPayload = {
  sub: string;
  role: "admin" | "student";
  email?: string;
};

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}
