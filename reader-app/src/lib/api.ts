const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function verifyAccess(
  reader: string,
  articleId: string,
): Promise<boolean> {
  const resp = await fetch(`${API_BASE}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reader, article_id: articleId }),
  });
  const data = await resp.json();
  return data.valid === true;
}

export async function recordRead(
  articleId: string,
  readerId: string,
  price: number,
): Promise<void> {
  await fetch(`${API_BASE}/record-read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ articleId, readerId, price }),
  });
}

export async function getContractInfo() {
  const resp = await fetch(`${API_BASE}/contract`);
  return resp.json();
}
