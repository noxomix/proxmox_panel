import { db } from '../../config/database.js';
import { users, userNamespaceRoles } from '../schemas/index.js';
import { namespaces } from '../schemas/namespaces.js';
import { roles } from '../schemas/roles.js';
import { eq } from 'drizzle-orm';
import { generateId } from '../../utils/uuid.js';
import { hashPassword } from '../../utils/password.js';

export const seedUsers = async () => {
  console.log('🌱 Seeding users...');
  
  try {
    // Clear existing user data
    await db.delete(userNamespaceRoles);
    await db.delete(users);
    
    // Get root namespace
    const rootNamespace = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.depth, 0))
      .limit(1);
    
    if (rootNamespace.length === 0) {
      throw new Error('Root namespace not found. Run namespace seed first.');
    }
    
    const rootNs = rootNamespace[0];
    
    // Get roles
    const adminRole = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'admin'))
      .limit(1);
    
    const customerRole = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'customer'))
      .limit(1);
    
    if (adminRole.length === 0) {
      throw new Error('Admin role not found. Run role seeds first.');
    }
    
    if (customerRole.length === 0) {
      throw new Error('Customer role not found. Run role seeds first.');
    }
    
    // Hash password for all users (password: 123)
    const hashedPassword = await hashPassword('123');
    
    const usersToCreate = [
      // Admin user - German
      {
        id: generateId(),
        name: 'Theo',
        username: 'theo',
        email: 'theo@example.com',
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Customer users for avatar testing with international names
      // A-F = Giraffe - Estonian (Anti Tamm)
      {
        id: generateId(),
        name: 'Anti Tamm',
        username: 'anti',
        email: 'anti@customer.com',
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      // G-L = Pinguin - Moldovan (Ion Popescu)
      {
        id: generateId(),
        name: 'Ion Popescu',
        username: 'ion',
        email: 'ion@customer.com',
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      // M-R = Wombat - Portuguese (Manuel Silva)
      {
        id: generateId(),
        name: 'Manuel Silva',
        username: 'manuel',
        email: 'manuel@customer.com',
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      // S-Z = Gorilla - Ghanaian (Samuel Asante)
      {
        id: generateId(),
        name: 'Samuel Asante',
        username: 'samuel',
        email: 'samuel@customer.com',
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Extra user - Uruguayan (Carlos Pérez)
      {
        id: generateId(),
        name: 'Carlos Pérez',
        username: 'carlos',
        email: 'carlos@customer.com',
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      },
      // Extra user - Slovak (Ján Novák)
      {
        id: generateId(),
        name: 'Ján Novák',
        username: 'jan',
        email: 'jan@customer.com',
        password_hash: hashedPassword,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    // Insert users
    await db.insert(users).values(usersToCreate);
    
    // Create user_namespace_roles assignments
    const userRoleAssignments = [
      // Theo gets admin role
      {
        user_id: usersToCreate[0].id, // Theo
        namespace_id: rootNs.id,
        role_id: adminRole[0].id,
        created_at: new Date(),
        updated_at: new Date()
      },
      // All others get customer role
      ...usersToCreate.slice(1).map(user => ({
        user_id: user.id,
        namespace_id: rootNs.id,
        role_id: customerRole[0].id,
        created_at: new Date(),
        updated_at: new Date()
      }))
    ];
    
    await db.insert(userNamespaceRoles).values(userRoleAssignments);
    
    console.log('✅ Users seeded successfully:');
    console.log('- theo (admin, German) - password "123"');
    console.log('- anti (customer, Estonian, giraffe avatar) - password "123"');
    console.log('- ion (customer, Moldovan, pinguin avatar) - password "123"');
    console.log('- manuel (customer, Portuguese, wombat avatar) - password "123"');
    console.log('- samuel (customer, Ghanaian, gorilla avatar) - password "123"');
    console.log('- carlos (customer, Uruguayan) - password "123"');
    console.log('- jan (customer, Slovak) - password "123"');
    
    return usersToCreate;
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};