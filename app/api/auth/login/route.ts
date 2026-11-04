import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/server/services/auth.service";
import { loginSchema } from "@/server/validation/auth.schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = loginSchema.parse(body);
    const result = await loginUser(validated);

    const response = NextResponse.json(result);
    response.cookies.set("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.message === "INVALID_CREDENTIALS") {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }
    const message = error.errors?.[0]?.message || error.message || "Login failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}

