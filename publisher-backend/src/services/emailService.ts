/**
 * Email Service
 * Sends magic links and notifications
 */

import nodemailer from "nodemailer";
import { query, queryOne } from "../db/client";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@byline.app";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Create transporter (configure via env vars)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export interface LoginToken {
  id: string;
  email: string;
  token: string;
  type: "magic_link" | "otp";
  expiresAt: Date;
}

/**
 * Generate a magic link token
 */
export async function generateMagicLink(email: string): Promise<LoginToken> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const id = uuidv4();

  await query(
    `INSERT INTO login_tokens (id, email, token, type, expires_at, created_at) 
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [id, email, token, "magic_link", expiresAt],
  );

  return { id, email, token, type: "magic_link", expiresAt };
}

/**
 * Verify and use a magic link token
 */
export async function verifyMagicLink(token: string): Promise<string | null> {
  const loginToken = await queryOne<{
    email: string;
    used: boolean;
    expires_at: Date;
  }>(
    "SELECT email, used, expires_at FROM login_tokens WHERE token = $1 AND type = $2",
    [token, "magic_link"],
  );

  if (!loginToken) {
    return null;
  }

  // Check expiration
  if (new Date() > new Date(loginToken.expires_at)) {
    return null;
  }

  // Check if already used
  if (loginToken.used) {
    return null;
  }

  // Mark as used
  await query("UPDATE login_tokens SET used = TRUE WHERE token = $1", [token]);

  return loginToken.email;
}

/**
 * Send magic link email
 */
export async function sendMagicLinkEmail(
  email: string,
  magicLinkToken: string,
): Promise<void> {
  const loginUrl = `${FRONTEND_URL}/auth/magic-link?token=${magicLinkToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .button { 
            display: inline-block; 
            background-color: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📖 Byline</h1>
          </div>
          
          <h2>Sign in to your Byline account</h2>
          
          <p>Click the link below to sign in. This link expires in 15 minutes.</p>
          
          <p>
            <a href="${loginUrl}" class="button">Sign In to Byline</a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            Or copy this link:<br/>
            <code style="background: #f3f4f6; padding: 8px; border-radius: 4px; display: block; word-break: break-all; margin-top: 8px;">
              ${loginUrl}
            </code>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            If you didn't request this email, you can safely ignore it.
          </p>
          
          <div class="footer">
            <p>© 2024 Byline. A decentralized publishing platform on Stellar.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: "Sign in to Byline",
      html: htmlContent,
      text: `Sign in to Byline: ${loginUrl}`,
    });
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    throw new Error("Failed to send email");
  }
}

/**
 * Send welcome email after first signup
 */
export async function sendWelcomeEmail(
  email: string,
  publicKey: string,
): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📖 Welcome to Byline!</h1>
          </div>
          
          <h2>You're all set to start reading.</h2>
          
          <p>Your managed Byline wallet has been created:</p>
          
          <p style="background: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px;">
            ${publicKey}
          </p>
          
          <div class="warning">
            <strong>🔒 About your wallet:</strong> Your wallet is managed by Byline for convenience. You can read articles and purchase access immediately without installing any extensions.
          </div>
          
          <h3>Ready to read?</h3>
          <p>Head to the Byline reader app and start exploring great content from independent publishers.</p>
          
          <h3>Want to take control?</h3>
          <p>You can export your wallet to Freighter (or any other wallet) anytime. You'll have full control of your keys and funds.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              © 2024 Byline. A decentralized publishing platform on Stellar.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: "Welcome to Byline!",
      html: htmlContent,
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Don't throw - signup shouldn't fail just because welcome email failed
  }
}
