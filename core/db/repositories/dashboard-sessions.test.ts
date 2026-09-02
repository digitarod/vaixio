import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../client.js";
import { upsertCustomer } from "./customers.js";
import { createDashboardUser } from "./dashboard-users.js";
import { createDashboardSession, deleteSession, findValidSession } from "./dashboard-sessions.js";

const runIfDb = process.env.DATABASE_URL ? describe : describe.skip;

async function makeUser() {
  const customer = await upsertCustomer(`test-ds-${Date.now()}-${Math.random()}`);
  return createDashboardUser({
    customerId: customer.id,
    email: `ds-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: "x",
  });
}

runIfDb("dashboard-sessions repository", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("creates a session and finds it while valid", async () => {
    const user = await makeUser();
    const session = await createDashboardSession({ dashboardUserId: user.id });

    const found = await findValidSession(session.id);
    expect(found?.dashboardUserId).toBe(user.id);
  });

  it("returns undefined for an unknown session id", async () => {
    expect(await findValidSession("00000000-0000-0000-0000-000000000000")).toBeUndefined();
  });

  it("no longer finds a session after deletion (logout)", async () => {
    const user = await makeUser();
    const session = await createDashboardSession({ dashboardUserId: user.id });

    await deleteSession(session.id);
    expect(await findValidSession(session.id)).toBeUndefined();
  });
});
