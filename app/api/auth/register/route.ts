import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/server/services/auth.service";
import { registerSchema } from "@/server/validation/auth.schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);
    const result = await registerUser(validated);

    const response = NextResponse.json(result, { status: 201 });
    response.cookies.set("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    if (error.message === "USER_ALREADY_EXISTS") {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 });
    }
    const message = error.errors?.[0]?.message || error.message || "Registration failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}

