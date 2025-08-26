const request = require('supertest');
const app = require('../app');
const { db } = require('../utils/database');
const { v4: uuidv4 } = require('uuid');

// Create a test user
async function createTestUser(email = 'test@example.com', additionalData = {}) {
  const userData = {
    email,
    username: `user_${uuidv4().substring(0, 8)}`,
    password: 'Test@1234',
    first_name: 'Test',
    last_name: 'User',
    ...additionalData,
  };

  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(userData);

  const user = response.body.data.user;

  // Verify email
  await db('users')
    .where({ id: user.id })
    .update({ is_verified: true });

  return user;
}

// Get auth token for a user
async function getAuthToken(email, password) {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  return response.body.data.tokens.accessToken;
}

// Create a test vehicle
async function createTestVehicle(authToken, vehicleData = {}) {
  const defaultData = {
    make: 'Toyota',
    model: 'Supra',
    year: 2023,
    ...vehicleData,
  };

  const response = await request(app)
    .post('/api/v1/vehicles')
    .set('Authorization', `Bearer ${authToken}`)
    .send(defaultData);

  return response.body.data;
}

// Create a test part
async function createTestPart(partData = {}) {
  const defaultData = {
    part_number: `PN-${uuidv4().substring(0, 8)}`,
    name: 'Test Part',
    category: 'engine',
    manufacturer: 'Test Manufacturer',
    price_min: 100,
    price_max: 200,
    ...partData,
  };

  const [part] = await db('parts')
    .insert(defaultData)
    .returning('*');

  return part;
}

// Create a test project
async function createTestProject(authToken, vehicleId, projectData = {}) {
  const defaultData = {
    vehicle_id: vehicleId,
    title: 'Test Project',
    description: 'Test project description',
    budget: 5000,
    ...projectData,
  };

  const response = await request(app)
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${authToken}`)
    .send(defaultData);

  return response.body.data;
}

// Clean up test data
async function cleanupTestData() {
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
}

module.exports = {
  createTestUser,
  getAuthToken,
  createTestVehicle,
  createTestPart,
  createTestProject,
  cleanupTestData,
};