const request = require('supertest');
const { app } = require('../../app');
const { sequelize, User } = require('../../models');
const { generateTokens } = require('../../middleware/auth');

describe('Auth API Integration Tests', () => {
  let server;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    server = app.listen(0); // Random port
  });

  afterAll(async () => {
    await server.close();
    await sequelize.close();
  });

  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  describe('POST /api/v1/auth/register', () => {
    const validUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User'
    };

    test('should register a new user successfully', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: validUser.email,
        username: validUser.username,
        firstName: validUser.firstName,
        lastName: validUser.lastName
      });
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    test('should not register user with existing email', async () => {
      await User.create(validUser);

      const response = await request(server)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });

    test('should validate required fields', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should enforce password requirements', async () => {
      const response = await request(server)
        .post('/api/v1/auth/register')
        .send({
          ...validUser,
          password: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('password');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser;
    const password = 'Test123!@#';

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password,
        isVerified: true
      });
    });

    test('should login with valid credentials', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    test('should not login with invalid password', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should not login with non-existent email', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should not login if email not verified', async () => {
      await testUser.update({ isVerified: false });

      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    test('should update last login timestamp', async () => {
      const originalLastLogin = testUser.lastLogin;

      await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password
        })
        .expect(200);

      await testUser.reload();
      expect(testUser.lastLogin).not.toBe(originalLastLogin);
      expect(new Date(testUser.lastLogin).getTime()).toBeGreaterThan(
        originalLastLogin ? new Date(originalLastLogin).getTime() : 0
      );
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let testUser;
    let authToken;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!@#',
        isVerified: true
      });
      const tokens = generateTokens(testUser.id);
      authToken = tokens.accessToken;
    });

    test('should get current user with valid token', async () => {
      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.stats).toHaveProperty('vehicleCount');
    });

    test('should not get user without token', async () => {
      const response = await request(server)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_AUTH_HEADER');
    });

    test('should not get user with invalid token', async () => {
      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    let testUser;
    const verificationToken = 'test-verification-token';

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!@#',
        isVerified: false,
        verificationToken
      });
    });

    test('should verify email with valid token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      await testUser.reload();
      expect(testUser.isVerified).toBe(true);
      expect(testUser.verificationToken).toBeNull();
    });

    test('should not verify with invalid token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let testUser;
    let refreshToken;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!@#',
        isVerified: true
      });
      const tokens = generateTokens(testUser.id);
      refreshToken = tokens.refreshToken;
    });

    test('should refresh tokens with valid refresh token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
      expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);
    });

    test('should not refresh with invalid token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!@#',
        isVerified: true
      });
    });

    test('should initiate password reset for existing user', async () => {
      const response = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      await testUser.reload();
      expect(testUser.resetPasswordToken).not.toBeNull();
      expect(testUser.resetPasswordExpires).not.toBeNull();
      expect(new Date(testUser.resetPasswordExpires).getTime()).toBeGreaterThan(Date.now());
    });

    test('should return success even for non-existent email', async () => {
      const response = await request(server)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('If an account exists, a password reset link has been sent');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    let testUser;
    const resetToken = 'test-reset-token';
    const newPassword = 'NewPassword123!@#';

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'OldPassword123!@#',
        isVerified: true,
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 3600000) // 1 hour from now
      });
    });

    test('should reset password with valid token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, password: newPassword })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      await testUser.reload();
      expect(testUser.resetPasswordToken).toBeNull();
      expect(testUser.resetPasswordExpires).toBeNull();

      // Should be able to login with new password
      const loginResponse = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: newPassword })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    test('should not reset password with expired token', async () => {
      await testUser.update({
        resetPasswordExpires: new Date(Date.now() - 3600000) // 1 hour ago
      });

      const response = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken, password: newPassword })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    test('should not reset password with invalid token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-token', password: newPassword })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Rate Limiting', () => {
    test('should rate limit excessive login attempts', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(server)
          .post('/api/v1/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});