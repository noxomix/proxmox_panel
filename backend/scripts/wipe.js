#!/usr/bin/env bun
import { pool } from '../config/database.js';

async function wipe() {
  console.log('🧹 Starting database wipe...');
  console.log('⚠️  WARNING: This will drop ALL tables in the database!');
  
  try {
    // Get all tables in the database
    const [tables] = await pool.execute('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('ℹ️  No tables found in database');
      return;
    }
    
    console.log(`📄 Found ${tables.length} tables to drop`);
    
    // Disable foreign key checks to avoid constraint issues
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Drop each table
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      console.log(`⏳ Dropping table: ${tableName}`);
      await pool.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`✅ Dropped table: ${tableName}`);
    }
    
    // Re-enable foreign key checks
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('🎉 Database wiped successfully!');
    
  } catch (error) {
    console.error('❌ Database wipe failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

wipe();