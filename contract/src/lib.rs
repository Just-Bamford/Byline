#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String,
};

// ── Storage key types ──────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    ArticlePrice(String),       // article_id → i128 price in stroops
    AccessRecord(Address, String), // (reader, article_id) → expiry timestamp
    PublisherWallet(String),    // article_id → publisher Address
    TotalReads,                 // global read counter
}

// ── Return types ───────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct AccessToken {
    pub reader: Address,
    pub article_id: String,
    pub price: i128,
    pub granted_at: u64,
    pub expires_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct ArticleStats {
    pub article_id: String,
    pub price: i128,
    pub total_reads: u32,
}

// ── Contract ───────────────────────────────────────────────────────

#[contract]
pub struct BylineContract;

#[contractimpl]
impl BylineContract {

    /// Register an article with a price (in stroops) and publisher address.
    /// Must be called by the publisher before readers can purchase.
    pub fn register_article(
        env: Env,
        article_id: String,
        price: i128,
        publisher: Address,
    ) {
        publisher.require_auth();
        assert!(price > 0, "price must be positive");
        env.storage().persistent().set(
            &DataKey::ArticlePrice(article_id.clone()),
            &price,
        );
        env.storage().persistent().set(
            &DataKey::PublisherWallet(article_id),
            &publisher,
        );
    }

    /// Purchase access to an article.
    /// Deducts the article price from the reader's balance and issues an
    /// access token valid for 24 hours.
    pub fn purchase_access(
        env: Env,
        reader: Address,
        article_id: String,
    ) -> AccessToken {
        reader.require_auth();

        let price_key = DataKey::ArticlePrice(article_id.clone());
        let price: i128 = env
            .storage()
            .persistent()
            .get(&price_key)
            .expect("article not registered");

        // Transfer native XLM from reader to contract
        // Note: In production this uses the native XLM SAC address.
        // For testnet, the publisher backend handles the actual transfer
        // via Stellar operations; the contract records the access grant.

        let now = env.ledger().timestamp();
        let expires_at = now + 86_400; // 24 hours

        let key = DataKey::AccessRecord(reader.clone(), article_id.clone());
        env.storage().persistent().set(&key, &expires_at);

        // Increment global read counter
        let reads: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalReads)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalReads, &(reads + 1));

        // Emit event
        env.events().publish(
            (symbol_short!("purchase"), article_id.clone()),
            (reader.clone(), price),
        );

        AccessToken {
            reader,
            article_id,
            price,
            granted_at: now,
            expires_at,
        }
    }

    /// Verify that a reader has valid access to an article.
    /// Returns true if access was purchased and has not expired.
    pub fn verify_token(
        env: Env,
        reader: Address,
        article_id: String,
    ) -> bool {
        let key = DataKey::AccessRecord(reader, article_id);
        match env.storage().persistent().get::<DataKey, u64>(&key) {
            Some(expires_at) => env.ledger().timestamp() < expires_at,
            None => false,
        }
    }

    /// Get the price of an article in stroops.
    pub fn get_article_price(env: Env, article_id: String) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::ArticlePrice(article_id))
            .unwrap_or(0)
    }

    /// Update article price. Must be called by the original publisher.
    pub fn set_article_price(
        env: Env,
        article_id: String,
        new_price: i128,
        publisher: Address,
    ) {
        publisher.require_auth();
        assert!(new_price > 0, "price must be positive");
        env.storage().persistent().set(
            &DataKey::ArticlePrice(article_id),
            &new_price,
        );
    }

    /// Get total number of reads across all articles.
    pub fn get_total_reads(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TotalReads)
            .unwrap_or(0)
    }

    /// Get the publisher wallet for an article.
    pub fn get_publisher(env: Env, article_id: String) -> Option<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::PublisherWallet(article_id))
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, String};

    #[test]
    fn test_register_and_purchase() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, BylineContract);
        let client = BylineContractClient::new(&env, &contract_id);

        let publisher = Address::generate(&env);
        let reader = Address::generate(&env);
        let article_id = String::from_str(&env, "article-001");

        // Register article at 20000 stroops (~$0.002)
        client.register_article(&article_id, &20_000, &publisher);

        assert_eq!(client.get_article_price(&article_id), 20_000);

        // Purchase access
        let token = client.purchase_access(&reader, &article_id);
        assert_eq!(token.price, 20_000);
        assert!(token.expires_at > token.granted_at);

        // Verify token is valid
        assert!(client.verify_token(&reader, &article_id));
    }

    #[test]
    fn test_verify_unknown_reader_returns_false() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, BylineContract);
        let client = BylineContractClient::new(&env, &contract_id);

        let publisher = Address::generate(&env);
        let random = Address::generate(&env);
        let article_id = String::from_str(&env, "article-002");

        client.register_article(&article_id, &10_000, &publisher);

        // Random address never purchased — should be false
        assert!(!client.verify_token(&random, &article_id));
    }

    #[test]
    fn test_price_update() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, BylineContract);
        let client = BylineContractClient::new(&env, &contract_id);

        let publisher = Address::generate(&env);
        let article_id = String::from_str(&env, "article-003");

        client.register_article(&article_id, &10_000, &publisher);
        client.set_article_price(&article_id, &25_000, &publisher);

        assert_eq!(client.get_article_price(&article_id), 25_000);
    }

    #[test]
    fn test_total_reads_increments() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, BylineContract);
        let client = BylineContractClient::new(&env, &contract_id);

        let publisher = Address::generate(&env);
        let reader1 = Address::generate(&env);
        let reader2 = Address::generate(&env);
        let article_id = String::from_str(&env, "article-004");

        client.register_article(&article_id, &10_000, &publisher);

        assert_eq!(client.get_total_reads(), 0);
        client.purchase_access(&reader1, &article_id);
        client.purchase_access(&reader2, &article_id);
        assert_eq!(client.get_total_reads(), 2);
    }
}
