const fetch = globalThis.fetch;
const BASE = process.env.API_BASE || "http://localhost:5000";

async function signup(email, password) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  return data.accessToken;
}

async function setProfile(token, fields) {
  const res = await fetch(`${BASE}/api/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  return data.user;
}

async function main() {
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD || "Password123!";
  const uniqueId = process.env.UNIQUE_ID;
  const name = process.env.NAME || uniqueId;
  if (!email || !uniqueId) {
    console.error("Set EMAIL and UNIQUE_ID env vars");
    process.exit(1);
  }
  const token = await signup(email, password);
  await setProfile(token, { uniqueid: uniqueId, name, bio: "Automated user" });
  console.log(JSON.stringify({ email, password, uniqueId, token }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
