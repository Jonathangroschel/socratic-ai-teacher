import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export async function POST() {
  const DB_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (!DB_URL) {
    return Response.json({ error: 'No database URL configured' }, { status: 500 });
  }

  try {
    const connection = postgres(DB_URL, { max: 1 });
    const db = drizzle(connection);

    console.log('⏳ Running manual migration...');
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    console.log('✅ Manual migration completed');

    return Response.json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    console.error('❌ Manual migration failed:', error);
    return Response.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
