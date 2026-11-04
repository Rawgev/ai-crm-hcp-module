import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserById } from "@/server/services/auth.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session.authenticated || !session.user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
