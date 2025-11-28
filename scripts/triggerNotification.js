const fetch = globalThis.fetch;
const BASE = process.env.API_BASE || 'http://localhost:5000';

async function authenticate(email, password) {
  const res = await fetch(`${BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  return data.accessToken;
}

async function createPost(token, content) {
  const res = await fetch(`${BASE}/api/post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  return data.post.id;
}

async function reactToPost(token, postId) {
  const res = await fetch(`${BASE}/api/posts/${postId}/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ emoji: '🚀' }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

async function main() {
  const receiverEmail = process.env.RECEIVER_EMAIL;
  const receiverPassword = process.env.RECEIVER_PASSWORD;
  const senderEmail = process.env.SENDER_EMAIL;
  const senderPassword = process.env.SENDER_PASSWORD;
  if (!receiverEmail || !receiverPassword || !senderEmail || !senderPassword) {
    console.error('Set RECEIVER_EMAIL, RECEIVER_PASSWORD, SENDER_EMAIL, SENDER_PASSWORD env vars');
    process.exit(1);
  }
  const receiverToken = await authenticate(receiverEmail, receiverPassword);
  const senderToken = await authenticate(senderEmail, senderPassword);
  const postId = await createPost(receiverToken, `SSE notification test ${Date.now()}`);
  await reactToPost(senderToken, postId);
  console.log('Triggered notification for post', postId);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
