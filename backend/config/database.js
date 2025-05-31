import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';

// Bun reads .env automatically

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'proxmox_panel',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10'),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '50'),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Create Drizzle instance
export const db = drizzle(pool);

// Test database connection
export const connectDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    console.log(`✅ Connected to MySQL database: ${dbConfig.database}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

// Graceful shutdown
export const closeDatabaseConnection = async () => {
  try {
    await pool.end();
    console.log('✅ Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, closing database connection...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, closing database connection...');
  await closeDatabaseConnection();
  process.exit(0);
});