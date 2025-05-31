import { db } from '../../config/database.js';
import { namespaces } from '../schemas/namespaces.js';
import { eq } from 'drizzle-orm';
import { generateId } from '../../utils/uuid.js';

export const seedNamespaces = async () => {
  console.log('🌱 Seeding namespaces...');
  
  try {
    // Check if root namespace already exists
    const existing = await db
      .select()
      .from(namespaces)
      .where(eq(namespaces.name, process.env.ROOT_NAMESPACE || 'root'))
      .limit(1);
    
    if (existing.length > 0) {
      console.log('ℹ️  Root namespace already exists');
      return existing[0];
    }
    
    // Create root namespace
    const rootNamespace = {
      id: generateId(),
      name: process.env.ROOT_NAMESPACE || 'root',
      parent_id: null,
      depth: 0,
      full_path: process.env.ROOT_NAMESPACE || 'root',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    await db.insert(namespaces).values(rootNamespace);
    
    console.log('✅ Root namespace created:', rootNamespace.name);
    return rootNamespace;
    
  } catch (error) {
    console.error('❌ Error seeding namespaces:', error);
    throw error;
  }
};