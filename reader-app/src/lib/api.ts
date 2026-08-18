const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// ── Article & Payment APIs ──

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

// ── Custodial Wallet Authentication APIs ──

export interface SignupResponse {
  success: boolean;
  message: string;
  email: string;
}

export interface VerifyResponse {
  success: boolean;
  sessionToken: string;
  walletAddress: string;
  walletType: string;
  email: string;
}

export interface ExportKeyResponse {
  success: boolean;
  publicKey: string;
  secretKey: string;
  warning: string;
}

export async function signupWithEmail(email: string): Promise<SignupResponse> {
  const resp = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!resp.ok) {
    const error = await resp.json();
    throw new Error(error.error || "Signup failed");
  }

  return resp.json();
}

export async function loginWithEmail(email: string): Promise<SignupResponse> {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!resp.ok) {
    const error = await resp.json();
    throw new Error(error.error || "Login failed");
  }

  return resp.json();
}

export async function verifyMagicLinkToken(
  token: string,
): Promise<VerifyResponse> {
  const resp = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!resp.ok) {
    const error = await resp.json();
    throw new Error(error.error || "Verification failed");
  }

  return resp.json();
}

export async function logout(sessionToken: string): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken }),
  });
}

export async function checkAuthStatus(
  sessionToken: string,
): Promise<{ authenticated: boolean; email?: string; userId?: string }> {
  const resp = await fetch(`${API_BASE}/auth/status`, {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });

  if (!resp.ok) {
    return { authenticated: false };
  }

  return resp.json();
}

export async function exportWalletKey(
  sessionToken: string,
  confirm: boolean = true,
): Promise<ExportKeyResponse> {
  const resp = await fetch(`${API_BASE}/auth/wallet/export-key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ confirm }),
  });

  if (!resp.ok) {
    const error = await resp.json();
    throw new Error(error.error || "Failed to export key");
  }

  return resp.json();
}
