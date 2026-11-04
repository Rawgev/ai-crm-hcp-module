import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["REP", "MANAGER", "COMPLIANCE_OFFICER", "ADMIN"]).default("REP"),
  territory: z.string().optional().default("South Zone"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = {
  email: string;
  password: string;
  name: string;
  role?: "REP" | "MANAGER" | "COMPLIANCE_OFFICER" | "ADMIN";
  territory?: string;
};

export type LoginInput = z.infer<typeof loginSchema>;
