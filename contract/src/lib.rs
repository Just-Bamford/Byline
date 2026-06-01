#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec, String, Map};

#[derive(Clone)]
#[contracttype]
pub struct AccessToken {
    pub reader: Address,
    pub article_id: String,
    pub price: i128,
    pub timestamp: u64,
    pub expiry: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct Article {
    pub id: String,
    pub publisher: Address,
    pub price: i128,
    pub created_at: u64,
}

#[contract]
pub struct BylineContract;

#[contractimpl]
impl BylineContract {
    /// Initialize contract with admin and token contract
    pub fn initialize(env: Env, admin: Address, token: Address) {
        let storage = env.storage().persistent();
        storage.set(&Symbol::new(&env, "admin"), &admin);
        storage.set(&Symbol::new(&env, "token"), &token);
    }

    /// Register a new article with a publisher
    pub fn register_article(
        env: Env,
        article_id: String,
        publisher: Address,
        price: i128,
    ) {
        publisher.require_auth();

        let storage = env.storage().persistent();
        let article = Article {
            id: article_id.clone(),
            publisher: publisher.clone(),
            price,
            created_at: env.ledger().timestamp(),
        };

        storage.set(&article_id, &article);
    }

    /// Reader purchases access to an article
    pub fn purchase_access(
        env: Env,
        reader: Address,
        article_id: String,
    ) -> AccessToken {
        reader.require_auth();

        let storage = env.storage().persistent();

        // Get article details
        let article: Article = storage
            .get(&article_id)
            .expect("Article not found")
            .unwrap();

        // TODO: Transfer payment from reader to publisher via token contract
        // For now, assume payment is handled externally

        let timestamp = env.ledger().timestamp();
        let expiry = timestamp + 86400; // 24h expiry

        let token = AccessToken {
            reader: reader.clone(),
            article_id: article_id.clone(),
            price: article.price,
            timestamp,
            expiry,
        };

        // Store token for verification
        let token_key = Symbol::new(&env, &format!("token-{}-{}", reader.to_string(), article_id));
        storage.set(&token_key, &token);

        token
    }

    /// Verify an access token is valid
    pub fn verify_token(env: Env, reader: Address, article_id: String) -> bool {
        let storage = env.storage().persistent();
        let current_time = env.ledger().timestamp();

        let token_key = Symbol::new(&env, &format!("token-{}-{}", reader.to_string(), article_id));
        
        match storage.get::<Symbol, AccessToken>(&token_key) {
            Ok(Some(token)) => {
                // Check expiry
                if current_time > token.expiry {
                    return false;
                }
                true
            }
            _ => false,
        }
    }

    /// Get article price
    pub fn get_article_price(env: Env, article_id: String) -> i128 {
        let storage = env.storage().persistent();
        
        match storage.get::<String, Article>(&article_id) {
            Ok(Some(article)) => article.price,
            _ => 1000, // Default: 0.001 XLM (1000 stroops)
        }
    }

    /// Update article price (publisher only)
    pub fn set_article_price(
        env: Env,
        article_id: String,
        new_price: i128,
        publisher: Address,
    ) {
        publisher.require_auth();

        let storage = env.storage().persistent();
        
        let mut article: Article = storage
            .get(&article_id)
            .expect("Article not found")
            .unwrap();

        // Verify publisher owns the article
        assert_eq!(article.publisher, publisher, "Only publisher can update price");

        article.price = new_price;
        storage.set(&article_id, &article);
    }

    /// Get article details
    pub fn get_article(env: Env, article_id: String) -> Article {
        let storage = env.storage().persistent();
        
        storage
            .get(&article_id)
            .expect("Article not found")
            .unwrap()
    }

    /// Get total reads for an article
    pub fn get_article_reads(env: Env, article_id: String) -> u32 {
        let storage = env.storage().persistent();
        let reads_key = Symbol::new(&env, &format!("reads-{}", article_id));
        
        storage
            .get::<Symbol, u32>(&reads_key)
            .unwrap_or(Ok(0))
            .unwrap_or(0)
    }

    /// Increment read count for an article
    pub fn increment_reads(env: Env, article_id: String) {
        let storage = env.storage().persistent();
        let reads_key = Symbol::new(&env, &format!("reads-{}", article_id));
        
        let current_reads = storage
            .get::<Symbol, u32>(&reads_key)
            .unwrap_or(Ok(0))
            .unwrap_or(0);

        storage.set(&reads_key, &(current_reads + 1));
    }
}
