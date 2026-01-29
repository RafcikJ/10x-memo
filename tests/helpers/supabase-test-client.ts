/**
 * Supabase Test Client
 * Helper for creating Supabase clients in tests
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';

/**
 * Create a test Supabase client
 * Use environment variables for test database
 */
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

  return createClient<Database>(supabaseUrl, supabaseKey);
}

/**
 * Create an admin test client (for setup/teardown)
 */
export function createTestSupabaseAdminClient() {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

/**
 * Helper to clean up test data
 */
export async function cleanupTestData(table: string, condition?: Record<string, any>) {
  const client = createTestSupabaseAdminClient();
  
  let query = client.from(table).delete();
  
  if (condition) {
    Object.entries(condition).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  return query;
}

/**
 * Helper to create test user
 */
export async function createTestUser(email: string) {
  const client = createTestSupabaseAdminClient();
  
  return client.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      test_user: true,
    },
  });
}

/**
 * Helper to delete test user
 */
export async function deleteTestUser(userId: string) {
  const client = createTestSupabaseAdminClient();
  
  return client.auth.admin.deleteUser(userId);
}
