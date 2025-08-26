const { db } = require('../utils/database');

// Global test setup
beforeAll(async () => {
  // Run migrations
  await db.migrate.latest();
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data
  const tables = [
    'reviews',
    'recommendations',
    'modification_projects',
    'vehicle_scans',
    'marketplace_integrations',
    'part_compatibility',
    'smart_bundles',
    'parts',
    'vehicles',
    'users',
  ];

  for (const table of tables) {
    await db(table).del();
  }
});

// Global teardown
afterAll(async () => {
  // Close database connection
  await db.destroy();
});