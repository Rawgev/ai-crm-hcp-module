import { SignJWT, jwtVerify } from "jose";
import { getAppConfig } from "../config";

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  name: string;
}

const config = getAppConfig();
const secret = new TextEncoder().encode(config.JWT_SECRET);

export async function signToken(payload: TokenPayload, expiresIn: string = config.JWT_EXPIRES_IN): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/token=([^;]+)/);
    if (match) return match[1];
  }

  return null;
}

