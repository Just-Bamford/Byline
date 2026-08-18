/**
 * Authentication Routes
 * Email signup/login with magic links for custodial wallets
 */

import { Router, Request, Response } from "express";
import {
  getOrCreateWallet,
  verifySessionToken,
  invalidateSession,
  createSession,
  markWalletExported,
  getWalletExportData,
  updateLastLogin,
} from "../services/custodialWalletService";
import {
  generateMagicLink,
  verifyMagicLink,
  sendMagicLinkEmail,
  sendWelcomeEmail,
} from "../services/emailService";
import { validateRequest } from "../middleware/validation";
import { rateLimit } from "express-rate-limit";

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts. Please try again later.",
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many signup attempts. Please try again later.",
});

/**
 * POST /auth/signup
 * Register with email, send magic link
 */
router.post("/signup", signupLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Create or get wallet
    const wallet = await getOrCreateWallet(email);

    // Generate magic link
    const loginToken = await generateMagicLink(email);

    // Send email
    try {
      await sendMagicLinkEmail(email, loginToken.token);
      // Send welcome email if new wallet (first signup for this email)
      if (wallet.lastLogin === null) {
        await sendWelcomeEmail(email, wallet.publicKey);
      }
    } catch (emailError) {
      console.error("Email send failed:", emailError);
      return res.status(500).json({
        error: "Failed to send email. Please check your email address.",
      });
    }

    res.json({
      success: true,
      message: "Check your email for a login link",
      email,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
});

/**
 * POST /auth/login
 * Request magic link for existing account
 */
router.post("/login", authLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Check if wallet exists
    const wallet = await getOrCreateWallet(email);
    if (!wallet) {
      // Don't reveal whether account exists
      return res.json({
        success: true,
        message: "Check your email for a login link",
      });
    }

    // Generate magic link
    const loginToken = await generateMagicLink(email);

    // Send email
    try {
      await sendMagicLinkEmail(email, loginToken.token);
    } catch (emailError) {
      console.error("Email send failed:", emailError);
      return res.status(500).json({
        error: "Failed to send email. Please check your email address.",
      });
    }

    res.json({
      success: true,
      message: "Check your email for a login link",
      email,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /auth/verify
 * Verify magic link token and create session
 */
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token required" });
    }

    // Verify the magic link
    const email = await verifyMagicLink(token);
    if (!email) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get wallet
    const wallet = await getOrCreateWallet(email);
    if (!wallet) {
      return res.status(500).json({ error: "Wallet creation failed" });
    }

    // Update last login
    await updateLastLogin(email);

    // Create session
    const session = await createSession(wallet.id, 24);

    res.json({
      success: true,
      sessionToken: session.sessionToken,
      walletAddress: wallet.publicKey,
      walletType: wallet.walletType,
      email: wallet.email,
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * POST /auth/logout
 * Invalidate session
 */
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ error: "Session token required" });
    }

    await invalidateSession(sessionToken);

    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

/**
 * GET /auth/status
 * Get current session status
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.headers.authorization?.replace("Bearer ", "");

    if (!sessionToken) {
      return res.json({ authenticated: false });
    }

    const auth = await verifySessionToken(sessionToken);
    if (!auth) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      email: auth.email,
      userId: auth.userId,
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Status check failed" });
  }
});

/**
 * POST /auth/wallet/export-key
 * Get secret key for export (one-time, with confirmation)
 */
router.post("/wallet/export-key", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.headers.authorization?.replace("Bearer ", "");
    const { confirm } = req.body;

    if (!sessionToken) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const auth = await verifySessionToken(sessionToken);
    if (!auth) {
      return res.status(401).json({ error: "Session expired" });
    }

    if (!confirm) {
      return res.status(400).json({
        error: "Confirmation required",
        warning: "This action reveals your secret key. Save it securely.",
      });
    }

    // Get export data (includes secret key)
    const exportData = await getWalletExportData(auth.email);
    if (!exportData) {
      return res.status(500).json({ error: "Wallet not found" });
    }

    // Mark as exported
    await markWalletExported(auth.email);

    res.json({
      success: true,
      publicKey: exportData.publicKey,
      secretKey: exportData.secretKey,
      warning: "NEVER share your secret key. Save it in a password manager.",
    });
  } catch (error) {
    console.error("Export key error:", error);
    res.status(500).json({ error: "Failed to export key" });
  }
});

export default router;
