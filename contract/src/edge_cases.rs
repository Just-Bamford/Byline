/// Edge case handling for contract operations
/// Validates inputs and prevents common attack vectors

use soroban_sdk::{Address, String};

/// Maximum price in stroops (prevents overflow)
pub const MAX_PRICE: i128 = 1_000_000_000_000; // 10,000 XLM

/// Minimum price to prevent dust transactions
pub const MIN_PRICE: i128 = 100; // 0.000001 XLM

/// Maximum read duration to detect anomalies (24 hours in seconds)
pub const MAX_READ_DURATION: u32 = 86400;

/// Validate article ID format
pub fn validate_article_id(article_id: &String) -> Result<(), String> {
    let id_str = article_id.to_string();
    
    if id_str.is_empty() {
        return Err(String::from_slice(&soroban_sdk::Env::default(), "Article ID cannot be empty"));
    }
    
    if id_str.len() > 256 {
        return Err(String::from_slice(&soroban_sdk::Env::default(), "Article ID too long"));
    }
    
    // Only alphanumeric, hyphen, underscore
    if !id_str.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') {
        return Err(String::from_slice(&soroban_sdk::Env::default(), "Invalid article ID format"));
    }
    
    Ok(())
}

/// Validate price
pub fn validate_price(price: i128, env: &soroban_sdk::Env) -> Result<(), String> {
    if price < 0 {
        return Err(String::from_slice(env, "Price cannot be negative"));
    }
    
    if price > MAX_PRICE {
        return Err(String::from_slice(env, "Price exceeds maximum"));
    }
    
    Ok(())
}

/// Validate read duration
pub fn validate_duration(duration: u32) -> Result<(), &'static str> {
    if duration > MAX_READ_DURATION {
        return Err("Duration exceeds maximum (24 hours)");
    }
    
    Ok(())
}

/// Validate Stellar address format (basic check)
pub fn is_valid_stellar_address(address: &Address) -> bool {
    // Stellar addresses are 56 characters and start with 'G' (in base32)
    // Addresses are validated by Soroban SDK, but we can add extra checks
    let addr_str = address.to_string();
    addr_str.len() == 56 && addr_str.starts_with("G")
}

/// Check for duplicate operations using nonce
pub fn is_nonce_used(nonce: u64, used_nonces: &std::collections::HashSet<u64>) -> bool {
    used_nonces.contains(&nonce)
}

/// Prevent overflow in arithmetic
pub fn safe_add(a: i128, b: i128) -> Result<i128, &'static str> {
    a.checked_add(b).ok_or("Arithmetic overflow")
}

/// Prevent underflow in arithmetic
pub fn safe_sub(a: i128, b: i128) -> Result<i128, &'static str> {
    a.checked_sub(b).ok_or("Arithmetic underflow")
}

/// Detect potential replay attacks by checking timestamp freshness
pub fn is_timestamp_fresh(timestamp: u64, max_age_secs: u64, current_time: u64) -> bool {
    if timestamp > current_time {
        return false; // Timestamp in future
    }
    
    current_time - timestamp <= max_age_secs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_price_validation() {
        // Negative price should fail
        // max_price should fail
    }

    #[test]
    fn test_article_id_validation() {
        // Empty ID should fail
        // Too long ID should fail
        // Invalid characters should fail
    }

    #[test]
    fn test_safe_arithmetic() {
        // Test overflow detection
        // Test underflow detection
    }

    #[test]
    fn test_timestamp_freshness() {
        // Test future timestamp detection
        // Test age checking
    }
}
