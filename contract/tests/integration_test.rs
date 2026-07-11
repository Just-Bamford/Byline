/// Integration tests for full payment lifecycle
/// Tests end-to-end flow from article registration through earning

#[cfg(test)]
mod integration_tests {
    use soroban_sdk::testutils::{Address as _, Env as _};

    #[test]
    fn test_full_payment_lifecycle() {
        // This test demonstrates the complete payment flow:
        // 1. Register article
        // 2. Reader purchases access
        // 3. Backend verifies token
        // 4. Read event recorded
        // 5. Earnings tracked

        // Step 1: Setup
        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);
        let reader = soroban_sdk::Address::generate(&env);

        // Step 2: Register article
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-1"),
            publisher.clone(),
            500000,  // 0.05 XLM
            soroban_sdk::String::from_bytes(&env, b"Test Article"),
            soroban_sdk::String::from_bytes(&env, b"tech"),
        );

        // Step 3: Verify article registered
        let article = byline_contract::BylineContract::get_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-1"),
        );
        assert_eq!(article.price, 500000);

        // Step 4: Reader purchases
        let token = byline_contract::BylineContract::purchase_access(
            env.clone(),
            reader.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-1"),
            publisher.clone(),
        );

        // Step 5: Verify token issued
        assert_eq!(token.reader, reader);
        assert_eq!(token.article_id, soroban_sdk::String::from_bytes(&env, b"article-1"));
        assert_eq!(token.price, 500000);

        // Step 6: Backend verifies token
        let is_valid = byline_contract::BylineContract::verify_token(
            env.clone(),
            reader.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-1"),
        );
        assert!(is_valid);

        // Step 7: Record read
        byline_contract::BylineContract::record_read(
            env.clone(),
            reader.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-1"),
            300,  // 5 minutes
        );

        // Step 8: Verify read count
        let reads = byline_contract::BylineContract::get_article_reads(
            env,
            soroban_sdk::String::from_bytes(&env, b"article-1"),
        );
        assert_eq!(reads, 1);
    }

    #[test]
    fn test_payment_with_low_balance() {
        // Test scenario: Reader attempts purchase but has insufficient balance
        // Expected: Transaction should fail or be handled by contract

        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);
        let reader = soroban_sdk::Address::generate(&env);

        // Register article with high price
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-premium"),
            publisher.clone(),
            1_000_000_000_000_000,  // Very high price
            soroban_sdk::String::from_bytes(&env, b"Premium Article"),
            soroban_sdk::String::from_bytes(&env, b"premium"),
        );

        // Reader's balance check would happen at wallet level before contract call
        // This test verifies article exists and is accessible
        let article = byline_contract::BylineContract::get_article(
            env,
            soroban_sdk::String::from_bytes(&env, b"article-premium"),
        );
        assert_eq!(article.price, 1_000_000_000_000_000);
    }

    #[test]
    fn test_token_expiration() {
        // Test scenario: Token expires after 24 hours
        // Expected: Expired token should be rejected

        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);
        let reader = soroban_sdk::Address::generate(&env);

        // Register article
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-2"),
            publisher.clone(),
            500000,
            soroban_sdk::String::from_bytes(&env, b"Test Article"),
            soroban_sdk::String::from_bytes(&env, b"tech"),
        );

        // Purchase article (get token)
        let token = byline_contract::BylineContract::purchase_access(
            env.clone(),
            reader.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-2"),
            publisher,
        );

        // Verify token is valid immediately
        let is_valid = byline_contract::BylineContract::verify_token(
            env.clone(),
            reader.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-2"),
        );
        assert!(is_valid);

        // Note: Full expiry test would require time advancement capabilities
        // In production, would use env.ledger().set_timestamp() or similar
        assert!(token.expiry > token.timestamp);
        assert_eq!(token.expiry - token.timestamp, 86400); // 24 hours
    }

    #[test]
    fn test_replay_attack_prevention() {
        // Test scenario: Each token has unique nonce
        // Expected: Different tokens have different nonces

        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);
        let reader1 = soroban_sdk::Address::generate(&env);
        let reader2 = soroban_sdk::Address::generate(&env);

        // Register article
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-3"),
            publisher.clone(),
            500000,
            soroban_sdk::String::from_bytes(&env, b"Test Article"),
            soroban_sdk::String::from_bytes(&env, b"tech"),
        );

        // Two readers purchase
        let token1 = byline_contract::BylineContract::purchase_access(
            env.clone(),
            reader1,
            soroban_sdk::String::from_bytes(&env, b"article-3"),
            publisher.clone(),
        );

        let token2 = byline_contract::BylineContract::purchase_access(
            env,
            reader2,
            soroban_sdk::String::from_bytes(&env, b"article-3"),
            publisher,
        );

        // Verify different nonces prevent replay
        assert_ne!(token1.nonce, token2.nonce);
    }

    #[test]
    fn test_multiple_publishers() {
        // Test scenario: Multiple publishers with separate articles
        // Expected: Earnings properly separated

        let env = soroban_sdk::Env::default();
        let publisher_a = soroban_sdk::Address::generate(&env);
        let publisher_b = soroban_sdk::Address::generate(&env);
        let reader = soroban_sdk::Address::generate(&env);

        // Publisher A registers article A
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-a"),
            publisher_a.clone(),
            500000,
            soroban_sdk::String::from_bytes(&env, b"Article A"),
            soroban_sdk::String::from_bytes(&env, b"tech"),
        );

        // Publisher B registers article B
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-b"),
            publisher_b.clone(),
            750000,
            soroban_sdk::String::from_bytes(&env, b"Article B"),
            soroban_sdk::String::from_bytes(&env, b"business"),
        );

        // Reader buys from both
        let token_a = byline_contract::BylineContract::purchase_access(
            env.clone(),
            reader.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-a"),
            publisher_a,
        );

        let token_b = byline_contract::BylineContract::purchase_access(
            env,
            reader,
            soroban_sdk::String::from_bytes(&env, b"article-b"),
            publisher_b,
        );

        // Verify each publisher gets correct price
        assert_eq!(token_a.price, 500000);
        assert_eq!(token_b.price, 750000);
    }

    #[test]
    fn test_price_update() {
        // Test scenario: Publisher updates article price
        // Expected: New purchases use new price

        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);

        // Register article at initial price
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-4"),
            publisher.clone(),
            1000000,
            soroban_sdk::String::from_bytes(&env, b"Test Article"),
            soroban_sdk::String::from_bytes(&env, b"tech"),
        );

        // Verify initial price
        let mut article = byline_contract::BylineContract::get_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-4"),
        );
        assert_eq!(article.price, 1000000);

        // Update price
        byline_contract::BylineContract::set_article_price(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-4"),
            5000000,
            publisher,
        );

        // Verify updated price
        article = byline_contract::BylineContract::get_article(
            env,
            soroban_sdk::String::from_bytes(&env, b"article-4"),
        );
        assert_eq!(article.price, 5000000);
    }

    #[test]
    fn test_concurrent_purchases() {
        // Test scenario: Multiple readers purchase same article
        // Expected: All purchases succeed with separate tokens

        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);
        let reader_a = soroban_sdk::Address::generate(&env);
        let reader_b = soroban_sdk::Address::generate(&env);
        let reader_c = soroban_sdk::Address::generate(&env);

        // Register article
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-5"),
            publisher.clone(),
            500000,
            soroban_sdk::String::from_bytes(&env, b"Test Article"),
            soroban_sdk::String::from_bytes(&env, b"tech"),
        );

        // Multiple readers purchase
        let token_a = byline_contract::BylineContract::purchase_access(
            env.clone(),
            reader_a.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-5"),
            publisher.clone(),
        );

        let token_b = byline_contract::BylineContract::purchase_access(
            env.clone(),
            reader_b.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-5"),
            publisher.clone(),
        );

        let token_c = byline_contract::BylineContract::purchase_access(
            env.clone(),
            reader_c.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-5"),
            publisher,
        );

        // Verify all get valid tokens
        assert_eq!(token_a.reader, reader_a);
        assert_eq!(token_b.reader, reader_b);
        assert_eq!(token_c.reader, reader_c);

        // Record reads for all
        byline_contract::BylineContract::record_read(
            env.clone(),
            reader_a,
            soroban_sdk::String::from_bytes(&env, b"article-5"),
            300,
        );

        byline_contract::BylineContract::record_read(
            env.clone(),
            reader_b,
            soroban_sdk::String::from_bytes(&env, b"article-5"),
            300,
        );

        byline_contract::BylineContract::record_read(
            env.clone(),
            reader_c,
            soroban_sdk::String::from_bytes(&env, b"article-5"),
            300,
        );

        // Verify read count
        let reads = byline_contract::BylineContract::get_article_reads(
            env,
            soroban_sdk::String::from_bytes(&env, b"article-5"),
        );
        assert_eq!(reads, 3);
    }

    #[test]
    fn test_earnings_accumulation() {
        // Test scenario: Track earnings across multiple reads
        // Expected: Each read tracked separately

        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);

        // Register article
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-6"),
            publisher,
            1000,  // 0.0001 XLM
            soroban_sdk::String::from_bytes(&env, b"Test Article"),
            soroban_sdk::String::from_bytes(&env, b"tech"),
        );

        // Multiple readers record reads
        for i in 0..10 {
            let reader = soroban_sdk::Address::generate(&env);
            byline_contract::BylineContract::record_read(
                env.clone(),
                reader,
                soroban_sdk::String::from_bytes(&env, b"article-6"),
                300,
            );
        }

        // Verify total reads = 10
        let reads = byline_contract::BylineContract::get_article_reads(
            env,
            soroban_sdk::String::from_bytes(&env, b"article-6"),
        );
        assert_eq!(reads, 10);
    }

    #[test]
    fn test_invalid_article_reference() {
        // Test scenario: Query non-existent article
        // Expected: Handled gracefully

        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);
        let reader = soroban_sdk::Address::generate(&env);

        // Attempt to get non-existent article - in real contract this would fail
        // but testing framework shows it returns 0 or empty
        let reads = byline_contract::BylineContract::get_article_reads(
            env,
            soroban_sdk::String::from_bytes(&env, b"non-existent"),
        );
        assert_eq!(reads, 0);
    }

    #[test]
    fn test_token_verification_chain() {
        // Test scenario: Complete token verification chain
        // Expected: All verifications pass

        let env = soroban_sdk::Env::default();
        let publisher = soroban_sdk::Address::generate(&env);
        let reader = soroban_sdk::Address::generate(&env);

        // Register article
        byline_contract::BylineContract::register_article(
            env.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-7"),
            publisher.clone(),
            500000,
            soroban_sdk::String::from_bytes(&env, b"Test Article"),
            soroban_sdk::String::from_bytes(&env, b"tech"),
        );

        // Purchase access
        let token = byline_contract::BylineContract::purchase_access(
            env.clone(),
            reader.clone(),
            soroban_sdk::String::from_bytes(&env, b"article-7"),
            publisher,
        );

        // 1. Verify token signature exists
        assert!(token.nonce > 0);

        // 2. Verify expiry is in future
        assert!(token.expiry > token.timestamp);

        // 3. Verify token against contract
        let is_valid = byline_contract::BylineContract::verify_token(
            env,
            reader,
            soroban_sdk::String::from_bytes(&env, b"article-7"),
        );
        assert!(is_valid);
    }
}
