import { findCustomerBySlug } from "../../core/db/repositories/customers.js";
import { createDashboardSession, deleteSession, findValidSession } from "../../core/db/repositories/dashboard-sessions.js";
import {
  createDashboardUser,
  findDashboardUserByEmail,
  findDashboardUserById,
  touchLastLogin,
  type DashboardUserRecord,
} from "../../core/db/repositories/dashboard-users.js";
import { hashPassword, verifyPassword } from "../../core/security/password.js";

export interface AuthResult {
  sessionId: string;
  user: Pick<DashboardUserRecord, "id" | "email" | "customerId">;
}

export class AuthError extends Error {
  constructor(
    public readonly code: "CUSTOMER_NOT_FOUND" | "EMAIL_TAKEN" | "INVALID_CREDENTIALS",
    message: string,
  ) {
    super(message);
  }
}

/**
 * §D: v1では「既にfounderが手動でcustomers/<name>/config.yamlをコミット済みの既存顧客」に
 * 限定する。customer_slugが projectToDb 済みの customers テーブルに無ければ登録できない。
 */
export async function registerDashboardUser(input: {
  customerSlug: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const customer = await findCustomerBySlug(input.customerSlug);
  if (!customer) {
    throw new AuthError("CUSTOMER_NOT_FOUND", `unknown customer: ${input.customerSlug}`);
  }

  const existing = await findDashboardUserByEmail(input.email);
  if (existing) {
    throw new AuthError("EMAIL_TAKEN", `email already registered: ${input.email}`);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createDashboardUser({ customerId: customer.id, email: input.email, passwordHash });
  const session = await createDashboardSession({ dashboardUserId: user.id });

  return { sessionId: session.id, user };
}

export async function loginDashboardUser(input: { email: string; password: string }): Promise<AuthResult> {
  const user = await findDashboardUserByEmail(input.email);
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AuthError("INVALID_CREDENTIALS", "email or password is incorrect");
  }

  await touchLastLogin(user.id);
  const session = await createDashboardSession({ dashboardUserId: user.id });
  return { sessionId: session.id, user };
}

export async function logoutDashboardUser(sessionId: string): Promise<void> {
  await deleteSession(sessionId);
}

export async function resolveSession(sessionId: string): Promise<DashboardUserRecord | undefined> {
  const session = await findValidSession(sessionId);
  if (!session) return undefined;
  return findDashboardUserById(session.dashboardUserId);
}
