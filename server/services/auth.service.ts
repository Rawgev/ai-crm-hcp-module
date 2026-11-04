import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth/jwt";
import { LoginInput, RegisterInput } from "../validation/auth.schema";
import {
  createFallbackUser,
  findFallbackUserByEmail,
  findFallbackUserById,
} from "./fallback-db";

export async function registerUser(input: RegisterInput) {
  let existingUser = null;
  try {
    existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });
  } catch {
    existingUser = findFallbackUserByEmail(input.email);
  }

  if (existingUser) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(input.password, salt);
  const newId = `user_${Date.now()}`;

  let user: { id: string; email: string; name: string; role: string; territory?: string | null };

  try {
    const created = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: input.role,
        territory: input.territory,
      },
    });
    user = created;
  } catch {
    console.warn("PostgreSQL unavailable, registering user in local SQLite store.");
    user = createFallbackUser({
      id: newId,
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role || "REP",
      territory: input.territory,
    });
  }

  const token = await signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      territory: user.territory || "South Zone",
    },
    token,
  };
}

export async function loginUser(input: LoginInput) {
  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { email: input.email },
    });
  } catch {
    user = findFallbackUserByEmail(input.email);
  }

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isMatch = await bcrypt.compare(input.password, user.passwordHash || user.password_hash);
  if (!isMatch) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const token = await signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      territory: user.territory || "South Zone",
    },
    token,
  };
}

export async function getUserById(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        territory: true,
        createdAt: true,
      },
    });
    if (user) return user;
  } catch {
    // try fallback
  }

  return findFallbackUserById(id);
}
