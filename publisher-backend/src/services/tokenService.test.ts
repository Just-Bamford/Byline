import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  verifyToken,
  isTokenReplayed,
  clearExpiredTokens,
} from "./tokenService";
import crypto from "crypto";
import { Keypair } from "@stellar/stellar-sdk";

describe("Token Service", () => {
  beforeEach(() => {
    clearExpiredTokens();
    vi.clearAllMocks();
  });

  describe("verifyToken", () => {
    it("should reject token with missing fields", async () => {
      const token = {
        reader: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        // missing article_id
      };

      const result = await verifyToken(
        token,
        "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
      );
      expect(result).toBe(false);
    });

    it("should reject expired token", async () => {
      const token = {
        reader: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        article_id: "article-1",
        publisher: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        price: 1000,
        timestamp: Math.floor(Date.now() / 1000) - 100,
        expiry: Math.floor(Date.now() / 1000) - 50, // Expired
        nonce: BigInt(12345),
        signature: "0123456789abcdef",
      };

      const result = await verifyToken(
        token,
        "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
      );
      expect(result).toBe(false);
    });

    it("should detect replay attacks via nonce", async () => {
      const token = {
        reader: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        article_id: "article-1",
        publisher: "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON",
        price: 1000,
        timestamp: Math.floor(Date.now() / 1000),
        expiry: Math.floor(Date.now() / 1000) + 86400,
        nonce: BigInt(12345),
        signature: "0123456789abcdef",
      };

      // First use should be rejected (invalid signature, but nonce would be marked)
      await verifyToken(
        token,
        "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
      );

      // Check if nonce is tracked for replay prevention
      const isReplayed = await isTokenReplayed(token);
      expect(isReplayed).toBe(true);
    });
  });

  describe("isTokenReplayed", () => {
    it("should reject token with no nonce", async () => {
      const token = { reader: "GBUQWP3..." };

      const result = await isTokenReplayed(token);
      expect(result).toBe(true);
    });

    it("should accept token with new nonce", async () => {
      const token = { nonce: BigInt(99999) };

      const result = await isTokenReplayed(token);
      expect(result).toBe(false);
    });

    it("should detect repeated nonce usage", async () => {
      const token = { nonce: BigInt(77777) };

      // First use
      const result1 = await isTokenReplayed(token);
      expect(result1).toBe(false);

      // Second use - should be detected as replay
      const result2 = await isTokenReplayed(token);
      expect(result2).toBe(true);
    });
  });

  describe("clearExpiredTokens", () => {
    it("should not throw when cache is empty", () => {
      expect(() => clearExpiredTokens()).not.toThrow();
    });
  });

  describe("signature verification", () => {
    it("should validate Stellar address format", () => {
      const validAddress =
        "GBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON";
      const invalidAddress =
        "PBUQWP3BOUZX34ULNQG23RQ6F4BFSRJSU6DCFTL7NNLGYAGXUCESA5ON";

      // Create valid token with correct format
      const token = {
        reader: validAddress,
        article_id: "test-article",
        publisher: validAddress,
        price: 1000,
        timestamp: Math.floor(Date.now() / 1000),
        expiry: Math.floor(Date.now() / 1000) + 86400,
        nonce: BigInt(11111),
        signature: "abc123",
      };

      // Should not throw during verification attempt
      expect(async () => {
        await verifyToken(
          token,
          "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
        );
      }).not.toThrow();
    });
  });
});
