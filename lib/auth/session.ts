import { extractAuthToken, verifyToken, TokenPayload } from "./jwt";

export interface SessionResult {
  authenticated: boolean;
  user: TokenPayload | null;
  error?: string;
}

export async function getSession(req: Request): Promise<SessionResult> {
  const token = extractAuthToken(req);
  if (!token) {
    return { authenticated: false, user: null, error: "No token provided" };
  }

  const user = await verifyToken(token);
  if (!user) {
    return { authenticated: false, user: null, error: "Invalid or expired token" };
  }

  return { authenticated: true, user };
}

export async function requireAuth(req: Request, allowedRoles?: string[]): Promise<TokenPayload> {
  const session = await getSession(req);
  if (!session.authenticated || !session.user) {
    throw new Error("UNAUTHORIZED");
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }

  return session.user;
}

