import bcrypt from 'bcrypt';

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
export const seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Hash the password
  const saltRounds = 12;
  const pepper = process.env.APPLICATION_SECRET || 'fallback-secret';
  const hashedPassword = await bcrypt.hash('123' + pepper, saltRounds);
  
  // Inserts seed entries
  await knex('users').insert([
    {
      name: 'theo',
      email: 'theo@example.com',
      password: hashedPassword,
      status: 'active'
    }
  ]);
};