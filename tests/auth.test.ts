import { describe, it, expect } from "vitest";
import { registerUser, loginUser, getUserById } from "@/server/services/auth.service";
import { verifyToken } from "@/lib/auth/jwt";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";

describe("Phase 1: Authentication & Session System", () => {
  const testEmail = `test_${Date.now()}@crm.example.com`;
  const testPassword = "password123";

  it("registers a new field representative user", async () => {
    const result = await registerUser({
      name: "Jordan Lee",
      email: testEmail,
      password: testPassword,
      role: "REP",
      territory: "North Zone",
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(testEmail);
    expect(result.user.name).toBe("Jordan Lee");
    expect(result.user.role).toBe("REP");
    expect(result.token).toBeDefined();

    // Verify token payload
    const payload = await verifyToken(result.token);
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe(testEmail);
    expect(payload?.role).toBe("REP");
  });

  it("prevents registration with duplicate email", async () => {
    await expect(
      registerUser({
        name: "Duplicate User",
        email: testEmail,
        password: "anotherPassword123",
        role: "REP",
        territory: "North Zone",
      })
    ).rejects.toThrow("USER_ALREADY_EXISTS");
  });

  it("authenticates valid user and returns JWT", async () => {
    const result = await loginUser({
      email: testEmail,
      password: testPassword,
    });

    expect(result.user.email).toBe(testEmail);
    expect(result.token).toBeDefined();

    const payload = await verifyToken(result.token);
    expect(payload?.id).toBe(result.user.id);
  });

  it("rejects login with incorrect password", async () => {
    await expect(
      loginUser({
        email: testEmail,
        password: "wrongPassword",
      })
    ).rejects.toThrow("INVALID_CREDENTIALS");
  });

  it("fetches user details by ID", async () => {
    const loggedIn = await loginUser({
      email: testEmail,
      password: testPassword,
    });

    const user = await getUserById(loggedIn.user.id);
    expect(user).not.toBeNull();
    expect(user?.email).toBe(testEmail);
  });

  it("POST /api/auth/logout clears token cookie", async () => {
    const res = await logoutRoute();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("token=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
