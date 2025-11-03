// Script to clear all data from the database (one-time use)
require('dotenv').config();
const { Pool } = require('pg');
const dns = require('dns');
const { promisify } = require('util');
const dnsLookup = promisify(dns.lookup);

async function clearDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    console.error('💡 To run this script:');
    console.error('   1. Set DATABASE_URL in your environment');
    console.error('   2. Or run: DATABASE_URL="your_connection_string" node clear-database.js');
    console.error('   3. Or run in Render console with DATABASE_URL already set');
    process.exit(1);
  }

  dns.setDefaultResultOrder('ipv4first');
  
  let connectionString = process.env.DATABASE_URL;
  try {
    const parsedUrl = new URL(connectionString);
    const username = parsedUrl.username;
    const password = encodeURIComponent(parsedUrl.password);
    const hostname = parsedUrl.hostname;
    const port = parsedUrl.port || '5432';
    const database = parsedUrl.pathname.slice(1);
    
    try {
      const resolved = await dnsLookup(hostname, { family: 4 });
      connectionString = `postgresql://${username}:${password}@${resolved.address}:${port}/${database}`;
    } catch (dnsError) {
      connectionString = `postgresql://${username}:${password}@${hostname}:${port}/${database}`;
    }
  } catch (urlError) {
    console.error('Invalid DATABASE_URL:', urlError.message);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🗑️  Clearing database...');
    
    // Delete in correct order (respecting foreign keys)
    await pool.query('DELETE FROM order_requests');
    console.log('✅ Cleared order_requests');
    
    await pool.query('DELETE FROM orders');
    console.log('✅ Cleared orders');
    
    await pool.query('DELETE FROM notifications');
    console.log('✅ Cleared notifications');
    
    await pool.query('DELETE FROM materials');
    console.log('✅ Cleared materials');
    
    await pool.query('DELETE FROM projects');
    console.log('✅ Cleared projects');
    
    // Keep admin user, delete others
    await pool.query("DELETE FROM users WHERE user_type != 'admin'");
    console.log('✅ Cleared non-admin users');
    
    console.log('✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearDatabase();

