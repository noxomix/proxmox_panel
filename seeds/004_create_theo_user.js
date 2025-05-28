import 'dotenv/config';
import bcrypt from 'bcrypt';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Get role IDs
  const adminRole = await knex('roles').where('name', 'admin').first();
  const customerRole = await knex('roles').where('name', 'customer').first();
  
  if (!adminRole) {
    throw new Error('Admin role not found. Please run role seeds first.');
  }
  
  if (!customerRole) {
    throw new Error('Customer role not found. Please run role seeds first.');
  }
  
  // Hash the password with current environment APPLICATION_SECRET
  const saltRounds = 12;
  const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
  const hashedPassword = await bcrypt.hash('123' + pepper, saltRounds);
  
  console.log('Seeding users with APPLICATION_SECRET:', pepper);
  
  // Inserts seed entries - users to test all avatar types
  const users = [
    // Admin user
    {
      name: 'Theo Admin',
      username: 'theo',
      email: 'theo@example.com',
      role_id: adminRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // Customer users for avatar testing
    // A-F = Giraffe
    {
      name: 'Alice Johnson',
      username: 'alice',
      email: 'alice@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // G-L = Pinguin  
    {
      name: 'Kate Williams',
      username: 'kate',
      email: 'kate@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // M-R = Wombat
    {
      name: 'Oliver Martinez',
      username: 'oliver',
      email: 'oliver@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // S-Z = Gorilla
    {
      name: 'Sarah Davis',
      username: 'sarah',
      email: 'sarah@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    }
  ];
  
  await knex('users').insert(users);
  
  console.log('Users seeded successfully:');
  console.log('- theo (admin) - password "123"');
  console.log('- alice (customer, giraffe avatar) - password "123"');
  console.log('- kate (customer, pinguin avatar) - password "123"');
  console.log('- oliver (customer, wombat avatar) - password "123"');
  console.log('- sarah (customer, gorilla avatar) - password "123"');
};