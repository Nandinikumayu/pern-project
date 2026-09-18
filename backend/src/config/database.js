let sqlite3 = null;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn('[DB] sqlite3 module not loaded:', e.message);
}

const fs = require('fs');
const path = require('path');

let pool = null;
let sqliteDb = null;
let isPgMem = false;
let isSqlite = false;

const dbFilePath = path.join(__dirname, '../../pern_erp.sqlite');

function initDatabase() {
  if (process.env.USE_REAL_PG === 'true' || process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pern_erp',
    });
    console.log('[DB] Using standard PostgreSQL connection pool.');
  } else if (sqlite3) {
    try {
      // Use SQLite persistent database on disk so data persists across restarts & user changes
      sqliteDb = new sqlite3.Database(dbFilePath);
      isSqlite = true;
      console.log(`[DB] Using SQLite persistent database at: ${dbFilePath}`);
    } catch (err) {
      console.warn('[DB] SQLite initialization failed, falling back to pg-mem:', err.message);
      const { newDb } = require('pg-mem');
      const memDbInstance = newDb({ noAstCoverageCheck: true });
      const adapter = memDbInstance.adapters.createPg();
      pool = new adapter.Pool();
      isPgMem = true;
    }
  } else {
    console.log('[DB] Fallback to pg-mem in-memory engine.');
    const { newDb } = require('pg-mem');
    const memDbInstance = newDb({ noAstCoverageCheck: true });
    const adapter = memDbInstance.adapters.createPg();
    pool = new adapter.Pool();
    isPgMem = true;
  }
}

initDatabase();

// Utility helper to convert Postgres $1, $2 syntax to SQLite ? syntax
function convertPgToSqlite(sql) {
  let paramIndex = 1;
  // Replace FOR UPDATE with empty string (SQLite doesn't use row-level locks syntax)
  let cleanSql = sql.replace(/FOR\s+UPDATE/gi, '');
  // Replace $1, $2, $3 with ?
  cleanSql = cleanSql.replace(/\$\d+/g, () => '?');
  return cleanSql;
}

// Custom query function for SQLite that returns { rows: [...] } matching pg API
function runSqliteQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    let cleanSql = convertPgToSqlite(sql);
    const trimmed = cleanSql.trim();

    // Handle transaction statements
    if (/^BEGIN/i.test(trimmed)) {
      sqliteDb.run('BEGIN TRANSACTION', (err) => {
        if (err) return reject(err);
        resolve({ rows: [] });
      });
      return;
    }
    if (/^COMMIT/i.test(trimmed)) {
      sqliteDb.run('COMMIT', (err) => {
        if (err) return reject(err);
        resolve({ rows: [] });
      });
      return;
    }
    if (/^ROLLBACK/i.test(trimmed)) {
      sqliteDb.run('ROLLBACK', (err) => {
        if (err) return reject(err);
        resolve({ rows: [] });
      });
      return;
    }

    // Handle SELECT queries
    if (/^SELECT/i.test(trimmed)) {
      sqliteDb.all(cleanSql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [] });
      });
      return;
    }

    // Handle INSERT / UPDATE / DELETE queries
    const hasReturning = /RETURNING\s+/i.test(cleanSql);
    let executionSql = cleanSql;
    if (hasReturning) {
      // Strip RETURNING clause for SQLite execution
      executionSql = cleanSql.replace(/RETURNING\s+.*$/i, '').trim();
    }

    sqliteDb.run(executionSql, params, function (err) {
      if (err) return reject(err);
      const lastID = this.lastID;
      const changes = this.changes;

      if (hasReturning && /^INSERT/i.test(trimmed)) {
        // Fetch inserted row by lastID
        const tableNameMatch = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
        const tableName = tableNameMatch ? tableNameMatch[1] : null;
        if (tableName && lastID) {
          sqliteDb.get(`SELECT * FROM ${tableName} WHERE id = ?`, [lastID], (err2, row) => {
            if (err2) return resolve({ rows: [{ id: lastID }] });
            resolve({ rows: row ? [row] : [{ id: lastID }] });
          });
          return;
        }
      }

      if (hasReturning && /^UPDATE/i.test(trimmed)) {
        // For UPDATE RETURNING, if params have ID, fetch the row
        const tableNameMatch = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)/i);
        const tableName = tableNameMatch ? tableNameMatch[1] : null;
        if (tableName && params.length > 0) {
          const idParam = params[params.length - 1];
          sqliteDb.get(`SELECT * FROM ${tableName} WHERE id = ?`, [idParam], (err2, row) => {
            if (err2) return resolve({ rows: [] });
            resolve({ rows: row ? [row] : [] });
          });
          return;
        }
      }

      resolve({ rows: [], lastID, changes });
    });
  });
}

async function runSchema() {
  if (isSqlite) {
    const sqliteSchema = `
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE,
          password_hash TEXT,
          role TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_name TEXT,
          contact_person TEXT,
          mobile TEXT,
          email TEXT,
          city TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_code TEXT UNIQUE,
          product_name TEXT,
          category TEXT,
          unit TEXT,
          base_price REAL
      );

      CREATE TABLE IF NOT EXISTS inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER UNIQUE,
          physical_quantity INTEGER DEFAULT 0,
          reserved_quantity INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enquiries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          enquiry_number TEXT UNIQUE,
          customer_id INTEGER,
          enquiry_date DATE,
          required_date DATE,
          notes TEXT,
          status TEXT DEFAULT 'NEW'
      );

      CREATE TABLE IF NOT EXISTS enquiry_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          enquiry_id INTEGER,
          product_id INTEGER,
          quantity INTEGER
      );

      CREATE TABLE IF NOT EXISTS quotations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quotation_number TEXT UNIQUE,
          enquiry_id INTEGER UNIQUE,
          customer_id INTEGER,
          valid_until DATE,
          status TEXT DEFAULT 'DRAFT',
          total_amount REAL DEFAULT 0.00
      );

      CREATE TABLE IF NOT EXISTS quotation_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          quotation_id INTEGER,
          product_id INTEGER,
          quantity INTEGER,
          unit_price REAL,
          discount_percent REAL DEFAULT 0.00,
          gst_percent REAL DEFAULT 18.00,
          line_amount REAL
      );

      CREATE TABLE IF NOT EXISTS sales_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT UNIQUE,
          quotation_id INTEGER UNIQUE,
          customer_id INTEGER,
          order_date DATE,
          total_amount REAL,
          status TEXT DEFAULT 'PENDING'
      );

      CREATE TABLE IF NOT EXISTS sales_order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sales_order_id INTEGER,
          product_id INTEGER,
          quantity INTEGER
      );

      CREATE TABLE IF NOT EXISTS dispatches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dispatch_number TEXT UNIQUE,
          sales_order_id INTEGER UNIQUE,
          dispatch_date DATE,
          vehicle_number TEXT,
          driver_name TEXT
      );

      CREATE TABLE IF NOT EXISTS dispatch_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dispatch_id INTEGER,
          product_id INTEGER,
          quantity INTEGER
      );
    `;

    return new Promise((resolve, reject) => {
      sqliteDb.exec(sqliteSchema, (err) => {
        if (err) {
          console.error('[DB] SQLite Schema Error:', err);
          return reject(err);
        }
        console.log('[DB] Persistent SQLite Schema initialized successfully.');
        resolve();
      });
    });
  }

  // PostgreSQL / pg-mem schema runner
  const schemaPath = path.join(__dirname, '../models/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    const statements = schemaSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await client.query(statement);
    }
    console.log('[DB] Schema initialized successfully.');
  } finally {
    client.release();
  }
}

async function query(text, params) {
  if (isSqlite) {
    return runSqliteQuery(text, params);
  }
  return pool.query(text, params);
}

async function getClient() {
  if (isSqlite) {
    return {
      query: (text, params) => runSqliteQuery(text, params),
      release: () => {},
    };
  }
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
  runSchema,
  isPgMem: () => isPgMem,
  isSqlite: () => isSqlite,
};
