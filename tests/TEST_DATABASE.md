# Testing with Supabase Database

This guide explains how to test with the Supabase database, both locally and in tests.

## 🏠 Local Supabase Setup

### Prerequisites

You need to have Supabase CLI installed. The project already has a `supabase/` directory with migrations.

### Starting Local Supabase

```bash
# Start local Supabase instance
npx supabase start

# This will output:
# - API URL: http://127.0.0.1:54321
# - Anon key: eyJh...
# - Service role key: eyJh...
```

### Stopping Local Supabase

```bash
npx supabase stop
```

### Resetting Local Database

```bash
# Reset database to clean state
npx supabase db reset
```

## 🧪 Testing with Database

### 1. Configure Test Environment

Copy `.env.test` to `.env.test.local` and fill in your local Supabase credentials:

```bash
cp tests/.env.test tests/.env.test.local
```

Edit `.env.test.local` with values from `supabase start` output:

```env
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 2. Use Test Helpers

The project includes test helpers in `tests/helpers/supabase-test-client.ts`:

```typescript
import {
  createTestSupabaseClient,
  createTestUser,
  deleteTestUser,
  cleanupTestData,
} from '../helpers/supabase-test-client';

describe('My Database Test', () => {
  let userId: string;

  beforeAll(async () => {
    const { data } = await createTestUser('test@example.com');
    userId = data.user.id;
  });

  afterAll(async () => {
    await deleteTestUser(userId);
  });

  it('should query data', async () => {
    const client = createTestSupabaseClient();
    const { data } = await client.from('lists').select('*');
    expect(data).toBeDefined();
  });
});
```

### 3. Running Database Tests

```bash
# Start local Supabase
npx supabase start

# Run integration tests
npm run test:unit -- tests/integration

# Or run specific test
npm run test:unit -- tests/integration/supabase.test.ts
```

## 📝 Writing Database Tests

### Example: Testing RLS Policies

```typescript
import { describe, it, expect } from 'vitest';
import { createTestSupabaseClient } from '../helpers/supabase-test-client';

describe('RLS Policies', () => {
  it('should block unauthorized access', async () => {
    const client = createTestSupabaseClient();
    
    // Try to access protected data without auth
    const { data, error } = await client
      .from('lists')
      .select('*');
    
    // Should return empty or error based on RLS
    expect(data).toEqual([]);
  });

  it('should allow access with valid auth', async () => {
    // Sign in as test user
    const client = createTestSupabaseClient();
    await client.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123',
    });
    
    // Should now have access
    const { data, error } = await client
      .from('lists')
      .select('*');
    
    expect(error).toBeNull();
  });
});
```

### Example: Testing Database Functions

```typescript
import { describe, it, expect } from 'vitest';
import { createTestSupabaseClient } from '../helpers/supabase-test-client';

describe('Database Functions', () => {
  it('should call consume_ai_generation function', async () => {
    const client = createTestSupabaseClient();
    
    const { data, error } = await client.rpc('consume_ai_generation', {
      user_id_param: 'test-user-id',
      words_count: 10,
    });
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

## 🔄 Test Lifecycle

### Setup and Teardown

Always clean up test data to keep tests isolated:

```typescript
import { describe, it, beforeEach, afterEach } from 'vitest';
import { cleanupTestData } from '../helpers/supabase-test-client';

describe('My Test Suite', () => {
  beforeEach(async () => {
    // Setup: Create test data
  });

  afterEach(async () => {
    // Cleanup: Remove test data
    await cleanupTestData('lists', { user_id: 'test-user-id' });
  });
});
```

## 🎯 Best Practices

### 1. Use Test Database
- Always use local Supabase for tests
- Never test against production database

### 2. Isolate Tests
- Each test should be independent
- Clean up data after tests
- Use unique test data (timestamps, UUIDs)

### 3. Test RLS Policies
- Test both authorized and unauthorized access
- Verify data isolation between users

### 4. Mock External Services
- Use MSW to mock OpenRouter API
- Don't make real API calls in tests

### 5. Performance
- Use database transactions for faster tests
- Reset database between test suites if needed

## 🚨 Common Issues

### Issue: Cannot connect to local Supabase

**Solution:** Make sure Supabase is running:
```bash
npx supabase status
```

### Issue: RLS policies blocking test queries

**Solution:** Use service role key for admin operations:
```typescript
import { createTestSupabaseAdminClient } from '../helpers/supabase-test-client';
const adminClient = createTestSupabaseAdminClient();
```

### Issue: Test data not cleaned up

**Solution:** Always use afterEach/afterAll hooks:
```typescript
afterEach(async () => {
  await cleanupTestData('your_table');
});
```

## 📊 CI/CD Integration

For GitHub Actions or other CI:

```yaml
- name: Setup Supabase
  run: |
    npx supabase start
    
- name: Run Tests
  env:
    PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
    PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  run: npm run test:unit
```

## 🔗 Useful Commands

```bash
# Start Supabase
npx supabase start

# Stop Supabase
npx supabase stop

# Reset database
npx supabase db reset

# View logs
npx supabase logs

# Check status
npx supabase status

# Run migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --local > src/db/database.types.ts
```

## 📚 Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Testing with Supabase](https://supabase.com/docs/guides/getting-started/testing)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
