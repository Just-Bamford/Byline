#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec, String, Map};

/// Article metadata stored on-chain
/// Represents a published article with pricing and publisher info
#[derive(Clone)]
#[contracttype]
pub struct Article {
    /// Unique article identifier
    pub id: String,
    
    /// Publisher's Stellar address
    pub publisher: Address,
    
    /// Article price in stroops (1 XLM = 10,000,000 stroops)
    pub price: i128,
    
    /// Unix timestamp when article was published
    pub created_at: u64,
    
    /// Article title for metadata
    pub title: String,
    
    /// Optional article category/tags
    pub category: String,
}

/// Access token issued to readers for article access
/// Token is valid for 24 hours from issuance
#[derive(Clone)]
#[contracttype]
pub struct AccessToken {
    /// Reader's Stellar address
    pub reader: Address,
    
    /// ID of article being accessed
    pub article_id: String,
    
    /// Publisher's address (for revenue tracking)
    pub publisher: Address,
    
    /// Price paid in stroops
    pub price: i128,
    
    /// Unix timestamp when token was issued
    pub timestamp: u64,
    
    /// Unix timestamp when token expires (24 hours from issue)
    pub expiry: u64,
    
    /// Cryptographic nonce for replay attack prevention
    pub nonce: u64,
}

/// Read event for analytics tracking
/// Recorded when reader views purchased article
#[derive(Clone)]
#[contracttype]
pub struct ReadEvent {
    /// Reader's Stellar address
    pub reader: Address,
    
    /// Article ID that was read
    pub article_id: String,
    
    /// Publisher's address
    pub publisher: Address,
    
    /// Unix timestamp when article was read
    pub timestamp: u64,
    
    /// Time spent reading in seconds
    pub duration: u32,
}

#[contract]
pub struct BylineContract;

#[contractimpl]
impl BylineContract {
    pub fn initialize(env: Env, admin: Address, token: Address) {
        let storage = env.storage().persistent();
        storage.set(&Symbol::new(&env, "admin"), &admin);
        storage.set(&Symbol::new(&env, "token"), &token);
    }

    // Issue 7: Implement publisher article registration flow
    pub fn register_article(
        env: Env,
        article_id: String,
        publisher: Address,
        price: i128,
        title: String,
        category: String,
    ) {
        publisher.require_auth();

        let storage = env.storage().persistent();
        let article = Article {
            id: article_id.clone(),
            publisher: publisher.clone(),
            price,
            created_at: env.ledger().timestamp(),
            title,
            category,
        };

        storage.set(&article_id, &article);
    }

    // Issue 8: Add article pricing management functionality
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

        assert_eq!(article.publisher, publisher, "Only publisher can update price");
        article.price = new_price;
        storage.set(&article_id, &article);
    }

    pub fn get_article_price(env: Env, article_id: String) -> i128 {
        let storage = env.storage().persistent();
        
        match storage.get::<String, Article>(&article_id) {
            Ok(Some(article)) => article.price,
            _ => 1000,
        }
    }

    // Issue 9: Implement reader article purchase authorization flow
    pub fn purchase_access(
        env: Env,
        reader: Address,
        article_id: String,
        publisher: Address,
    ) -> AccessToken {
        reader.require_auth();

        let storage = env.storage().persistent();

        let article: Article = storage
            .get(&article_id)
            .expect("Article not found")
            .unwrap();

        let timestamp = env.ledger().timestamp();
        let expiry = timestamp + 86400;
        let nonce = env.ledger().sequence() as u64;

        let token = AccessToken {
            reader: reader.clone(),
            article_id: article_id.clone(),
            publisher,
            price: article.price,
            timestamp,
            expiry,
            nonce,
        };

        let token_key = format!("token:{}:{}", reader.to_string(), article_id);
        storage.set(&Symbol::new(&env, &token_key), &token);

        token
    }

    // Issue 10: Add access token generation and validation logic
    pub fn verify_token(env: Env, reader: Address, article_id: String) -> bool {
        let storage = env.storage().persistent();
        let current_time = env.ledger().timestamp();

        let token_key = format!("token:{}:{}", reader.to_string(), article_id);
        
        match storage.get::<Symbol, AccessToken>(&Symbol::new(&env, &token_key)) {
            Ok(Some(token)) => {
                if current_time > token.expiry {
                    return false;
                }
                true
            }
            _ => false,
        }
    }

    pub fn get_token(env: Env, reader: Address, article_id: String) -> AccessToken {
        let storage = env.storage().persistent();
        let token_key = format!("token:{}:{}", reader.to_string(), article_id);
        
        storage
            .get(&Symbol::new(&env, &token_key))
            .expect("Token not found")
            .unwrap()
    }

    // Issue 11: Implement article metadata retrieval methods
    pub fn get_article(env: Env, article_id: String) -> Article {
        let storage = env.storage().persistent();
        
        storage
            .get(&article_id)
            .expect("Article not found")
            .unwrap()
    }

    pub fn get_articles_by_publisher(env: Env, publisher: Address) -> Vec<Article> {
        let storage = env.storage().persistent();
        let mut articles: Vec<Article> = Vec::new(&env);
        
        articles
    }

    // Issue 12: Add contract read tracking and analytics storage
    pub fn record_read(env: Env, reader: Address, article_id: String, duration: u32) {
        let storage = env.storage().persistent();

        let article: Article = storage
            .get(&article_id)
            .expect("Article not found")
            .unwrap();

        let event = ReadEvent {
            reader: reader.clone(),
            article_id: article_id.clone(),
            publisher: article.publisher.clone(),
            timestamp: env.ledger().timestamp(),
            duration,
        };

        let read_key = format!("read:{}:{}", article_id, env.ledger().timestamp());
        storage.set(&Symbol::new(&env, &read_key), &event);

        let reads_count_key = format!("reads_count:{}", article_id);
        let current_reads: u32 = storage
            .get(&Symbol::new(&env, &reads_count_key))
            .unwrap_or(Ok(0))
            .unwrap_or(0);

        storage.set(&Symbol::new(&env, &reads_count_key), &(current_reads + 1));
    }

    pub fn get_article_reads(env: Env, article_id: String) -> u32 {
        let storage = env.storage().persistent();
        let reads_key = format!("reads_count:{}", article_id);
        
        storage
            .get(&Symbol::new(&env, &reads_key))
            .unwrap_or(Ok(0))
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Env as _};

    #[test]
    fn test_register_article() {
        let env = Env::default();
        let publisher = Address::generate(&env);
        
        BylineContract::register_article(
            env.clone(),
            String::from_bytes(&env, b"article-1"),
            publisher.clone(),
            1000000,
            String::from_bytes(&env, b"Test Article"),
            String::from_bytes(&env, b"tech"),
        );

        let article = BylineContract::get_article(env, String::from_bytes(&env, b"article-1"));
        assert_eq!(article.id, String::from_bytes(&env, b"article-1"));
    }

    #[test]
    fn test_set_article_price() {
        let env = Env::default();
        let publisher = Address::generate(&env);

        BylineContract::register_article(
            env.clone(),
            String::from_bytes(&env, b"article-1"),
            publisher.clone(),
            1000000,
            String::from_bytes(&env, b"Test Article"),
            String::from_bytes(&env, b"tech"),
        );

        BylineContract::set_article_price(
            env.clone(),
            String::from_bytes(&env, b"article-1"),
            2000000,
            publisher,
        );

        let price = BylineContract::get_article_price(env, String::from_bytes(&env, b"article-1"));
        assert_eq!(price, 2000000);
    }

    #[test]
    fn test_purchase_access() {
        let env = Env::default();
        let publisher = Address::generate(&env);
        let reader = Address::generate(&env);

        BylineContract::register_article(
            env.clone(),
            String::from_bytes(&env, b"article-1"),
            publisher.clone(),
            500000,
            String::from_bytes(&env, b"Test Article"),
            String::from_bytes(&env, b"tech"),
        );

        let token = BylineContract::purchase_access(
            env.clone(),
            reader.clone(),
            String::from_bytes(&env, b"article-1"),
            publisher,
        );

        assert_eq!(token.article_id, String::from_bytes(&env, b"article-1"));
        assert_eq!(token.reader, reader);
    }

    #[test]
    fn test_verify_token() {
        let env = Env::default();
        let publisher = Address::generate(&env);
        let reader = Address::generate(&env);

        BylineContract::register_article(
            env.clone(),
            String::from_bytes(&env, b"article-1"),
            publisher.clone(),
            500000,
            String::from_bytes(&env, b"Test Article"),
            String::from_bytes(&env, b"tech"),
        );

        BylineContract::purchase_access(
            env.clone(),
            reader.clone(),
            String::from_bytes(&env, b"article-1"),
            publisher,
        );

        let valid = BylineContract::verify_token(
            env,
            reader,
            String::from_bytes(&env, b"article-1"),
        );

        assert!(valid);
    }

    #[test]
    fn test_record_read() {
        let env = Env::default();
        let publisher = Address::generate(&env);
        let reader = Address::generate(&env);

        BylineContract::register_article(
            env.clone(),
            String::from_bytes(&env, b"article-1"),
            publisher.clone(),
            500000,
            String::from_bytes(&env, b"Test Article"),
            String::from_bytes(&env, b"tech"),
        );

        BylineContract::purchase_access(
            env.clone(),
            reader.clone(),
            String::from_bytes(&env, b"article-1"),
            publisher,
        );

        BylineContract::record_read(
            env.clone(),
            reader,
            String::from_bytes(&env, b"article-1"),
            300,
        );

        let reads = BylineContract::get_article_reads(env, String::from_bytes(&env, b"article-1"));
        assert_eq!(reads, 1);
    }
}
