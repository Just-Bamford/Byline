/**
 * PostgreSQL database client
 * Manages connections and query execution
 */

import pg from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Initialize database connection pool
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is not set. Set it to connect to PostgreSQL.",
      );
    }

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    console.log("✓ Database connection successful");
    client.release();

    // Run schema initialization
    await initializeSchema();
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

/**
 * Initialize database schema
 */
async function initializeSchema(): Promise<void> {
  try {
    if (!pool) {
      throw new Error("Database pool not initialized");
    }

    const schemaPath = join(__dirname, "schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");

    await pool.query(schema);
    console.log("✓ Database schema initialized");
  } catch (error) {
    console.error("Failed to initialize schema:", error);
    throw error;
  }
}

/**
 * Get database connection pool
 */
export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  values?: any[],
): Promise<pg.QueryResult<T>> {
  if (!pool) {
    throw new Error("Database not initialized");
  }
  return pool.query<T>(text, values);
}

/**
 * Get a single row
 */
export async function queryOne<T extends pg.QueryResultRow = any>(
  text: string,
  values?: any[],
): Promise<T | null> {
  const result = await query<T>(text, values);
  return result.rows[0] || null;
}

/**
 * Get multiple rows
 */
export async function queryMany<T extends pg.QueryResultRow = any>(
  text: string,
  values?: any[],
): Promise<T[]> {
  const result = await query<T>(text, values);
  return result.rows;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  if (!pool) {
    throw new Error("Database not initialized");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("Database connection closed");
  }
}
