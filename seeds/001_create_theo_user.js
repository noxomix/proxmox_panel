import 'dotenv/config';
import bcrypt from 'bcrypt';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Hash the password with current environment APPLICATION_SECRET
  const saltRounds = 12;
  const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
  const hashedPassword = await bcrypt.hash('123' + pepper, saltRounds);
  
  console.log('Seeding user with APPLICATION_SECRET:', pepper);
  
  // Inserts seed entries
  await knex('users').insert([
    {
      name: 'theo',
      username: 'theo',
      email: 'theo@example.com',
      password_hash: hashedPassword,
      status: 'active'
    }
  ]);
  
  console.log('User "theo" seeded successfully with password "123"');
};