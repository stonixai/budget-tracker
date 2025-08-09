import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

async function initUser() {
  console.log('🔍 Checking for existing users...');
  
  try {
    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, 'admin@example.com'));
    
    if (existingUsers.length > 0) {
      console.log('✅ User already exists:', existingUsers[0].email);
      return;
    }
    
    // Create a default user
    const [user] = await db.insert(users).values({
      name: 'Default User',
      email: 'admin@example.com',
    }).returning();
    
    console.log('✅ Created default user:', user.email);
  } catch (error) {
    console.error('❌ Error initializing user:', error);
  }
}

initUser().catch(console.error);