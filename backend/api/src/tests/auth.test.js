const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../middleware/auth');

describe('Authentication Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test@1234',
        first_name: 'Test',
        last_name: 'User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'testuser1',
        password: 'Test@1234',
      };

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...userData, username: 'testuser2' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });

    it('should validate password requirements', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak', // Too short
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      // Create test user
      const userData = {
        email: 'login@example.com',
        username: 'loginuser',
        password: 'Test@1234',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testUser = response.body.data.user;

      // Verify email (bypass verification for testing)
      const { db } = require('../utils/database');
      await db('users')
        .where({ id: testUser.id })
        .update({ is_verified: true });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test@1234',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('sessionId');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject unverified email', async () => {
      // Unverify the user
      const { db } = require('../utils/database');
      await db('users')
        .where({ id: testUser.id })
        .update({ is_verified: false });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test@1234',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Email not verified');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      // Create and login test user
      const userData = {
        email: 'me@example.com',
        username: 'meuser',
        password: 'Test@1234',
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      testUser = registerResponse.body.data.user;

      // Verify email
      const { db } = require('../utils/database');
      await db('users')
        .where({ id: testUser.id })
        .update({ is_verified: true });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      authToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should return current user data', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe('me@example.com');
      expect(response.body.data).toHaveProperty('stats');
    });

    it('should reject unauthorized requests', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;
    let sessionId;

    beforeEach(async () => {
      // Create and login test user
      const userData = {
        email: 'refresh@example.com',
        username: 'refreshuser',
        password: 'Test@1234',
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Verify email
      const { db } = require('../utils/database');
      const user = await db('users')
        .where({ email: userData.email })
        .first();
      
      await db('users')
        .where({ id: user.id })
        .update({ is_verified: true });

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      refreshToken = loginResponse.body.data.tokens.refreshToken;
      sessionId = loginResponse.body.data.sessionId;
    });

    it('should refresh access token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
          sessionId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('expiresIn');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
          sessionId,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});