import 'dotenv/config';
import bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';

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
  
  // Inserts seed entries - users to test all avatar types with international names
  const users = [
    // Admin user - German
    {
      id: uuidv7(),
      name: 'Theo',
      username: 'theo',
      email: 'theo@example.com',
      role_id: adminRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // Customer users for avatar testing with international names
    // A-F = Giraffe - Estonian (Jaan Tamm equivalent)
    {
      id: uuidv7(),
      name: 'Anti Tamm',
      username: 'anti',
      email: 'anti@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // G-L = Pinguin - Moldovan (Ion Popescu equivalent)
    {
      id: uuidv7(),
      name: 'Ion Popescu',
      username: 'ion',
      email: 'ion@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // M-R = Wombat - Portuguese (João Silva equivalent)
    {
      id: uuidv7(),
      name: 'Manuel Silva',
      username: 'manuel',
      email: 'manuel@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // S-Z = Gorilla - Ghanaian (Kwame Asante equivalent)
    {
      id: uuidv7(),
      name: 'Samuel Asante',
      username: 'samuel',
      email: 'samuel@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // Extra user - Uruguayan (Juan Pérez equivalent)
    {
      id: uuidv7(),
      name: 'Carlos Pérez',
      username: 'carlos',
      email: 'carlos@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    },
    // Extra user - Slovak (Ján Novák equivalent)
    {
      id: uuidv7(),
      name: 'Ján Novák',
      username: 'jan',
      email: 'jan@customer.com',
      role_id: customerRole.id,
      password_hash: hashedPassword,
      status: 'active'
    }
  ];
  
  await knex('users').insert(users);
  
  console.log('Users seeded successfully:');
  console.log('- theo (admin, German) - password "123"');
  console.log('- anti (customer, Estonian, giraffe avatar) - password "123"');
  console.log('- ion (customer, Moldovan, pinguin avatar) - password "123"');
  console.log('- manuel (customer, Portuguese, wombat avatar) - password "123"');
  console.log('- samuel (customer, Ghanaian, gorilla avatar) - password "123"');
  console.log('- carlos (customer, Uruguayan) - password "123"');
  console.log('- jan (customer, Slovak) - password "123"');
};