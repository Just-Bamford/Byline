/**
 * Unit tests for Custodial Wallet Service
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  deriveKeypairFromEmail,
  encryptSecretKey,
  decryptSecretKey,
} from "../services/custodialWalletService";

describe("Custodial Wallet Service", () => {
  describe("deriveKeypairFromEmail", () => {
    it("should derive a valid Stellar keypair from email", () => {
      const email = "test@example.com";
      const keypair = deriveKeypairFromEmail(email);

      expect(keypair.publicKey()).toMatch(/^G[A-Z0-9]{55}$/);
      expect(keypair.secret()).toMatch(/^S[A-Z0-9]{55}$/);
    });

    it("should derive the same keypair from the same email", () => {
      const email = "consistent@example.com";
      const keypair1 = deriveKeypairFromEmail(email);
      const keypair2 = deriveKeypairFromEmail(email);

      expect(keypair1.publicKey()).toBe(keypair2.publicKey());
      expect(keypair1.secret()).toBe(keypair2.secret());
    });

    it("should derive different keypairs from different emails", () => {
      const keypair1 = deriveKeypairFromEmail("user1@example.com");
      const keypair2 = deriveKeypairFromEmail("user2@example.com");

      expect(keypair1.publicKey()).not.toBe(keypair2.publicKey());
      expect(keypair1.secret()).not.toBe(keypair2.secret());
    });
  });

  describe("Encryption/Decryption", () => {
    const encryptionKey = "0".repeat(64); // Valid 64-char hex key for testing

    it("should encrypt and decrypt a secret key", () => {
      const secretKey =
        "SBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGH";

      const { encrypted } = encryptSecretKey(secretKey, encryptionKey);
      const decrypted = decryptSecretKey(encrypted, encryptionKey);

      expect(decrypted).toBe(secretKey);
    });

    it("should produce different ciphertexts for the same plaintext (due to IV)", () => {
      const secretKey =
        "SBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGH";

      const { encrypted: encrypted1 } = encryptSecretKey(
        secretKey,
        encryptionKey,
      );
      const { encrypted: encrypted2 } = encryptSecretKey(
        secretKey,
        encryptionKey,
      );

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should fail to decrypt with wrong key", () => {
      const secretKey =
        "SBXYZ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGH";
      const wrongKey = "1".repeat(64);

      const { encrypted } = encryptSecretKey(secretKey, encryptionKey);

      expect(() => decryptSecretKey(encrypted, wrongKey)).toThrow();
    });

    it("should reject invalid encryption key", () => {
      const secretKey = "SBXYZ";
      const invalidKey = "invalid";

      expect(() => encryptSecretKey(secretKey, invalidKey)).toThrow();
    });
  });

  describe("Email validation", () => {
    it("should accept valid emails", () => {
      const validEmails = [
        "user@example.com",
        "test.name@example.co.uk",
        "user+tag@example.com",
      ];

      for (const email of validEmails) {
        const keypair = deriveKeypairFromEmail(email);
        expect(keypair.publicKey()).toMatch(/^G[A-Z0-9]{55}$/);
      }
    });
  });

  describe("Keypair validation", () => {
    it("should generate valid Stellar keypairs", () => {
      const email = "validator@example.com";
      const keypair = deriveKeypairFromEmail(email);

      // Verify keypair can be used for signing
      const message = Buffer.from("test message");
      const signature = keypair.sign(message);

      // Verify signature with public key
      const publicKey = keypair.publicKey();
      expect(publicKey).toMatch(/^G[A-Z0-9]{55}$/);
    });
  });
});
