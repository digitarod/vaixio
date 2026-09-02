import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../client.js";
import { upsertCustomer } from "./customers.js";
import { createDashboardUser, findDashboardUserByEmail, findDashboardUserById, touchLastLogin } from "./dashboard-users.js";

const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

runIfDb("dashboard-users repository", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("creates a user and finds it by email and id", async () => {
    const customer = await upsertCustomer(`test-du-${Date.now()}`);
    const user = await createDashboardUser({
      customerId: customer.id,
      email: `user-${Date.now()}@example.com`,
      passwordHash: "scrypt:dummy:dummy",
    });

    expect(await findDashboardUserByEmail(user.email)).toMatchObject({ id: user.id });
    expect(await findDashboardUserById(user.id)).toMatchObject({ email: user.email });
  });

  it("returns undefined for an unknown email", async () => {
    expect(await findDashboardUserByEmail("nobody@example.com")).toBeUndefined();
  });

  it("rejects a duplicate email (unique constraint)", async () => {
    const customer = await upsertCustomer(`test-du-dup-${Date.now()}`);
    const email = `dup-${Date.now()}@example.com`;
    await createDashboardUser({ customerId: customer.id, email, passwordHash: "x" });

    await expect(createDashboardUser({ customerId: customer.id, email, passwordHash: "y" })).rejects.toThrow();
  });

  it("records lastLoginAt on touchLastLogin", async () => {
    const customer = await upsertCustomer(`test-du-login-${Date.now()}`);
    const user = await createDashboardUser({
      customerId: customer.id,
      email: `login-${Date.now()}@example.com`,
      passwordHash: "x",
    });
    expect(user.lastLoginAt).toBeNull();

    await touchLastLogin(user.id);
    const updated = await findDashboardUserById(user.id);
    expect(updated?.lastLoginAt).not.toBeNull();
  });
});
