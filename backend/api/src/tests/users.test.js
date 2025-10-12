const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../middleware/auth');

describe('User Controller', () => {
  let authToken;
  let adminToken;

  beforeAll(async () => {
    authToken = generateToken({ id: 1, email: 'test@example.com' });
    adminToken = generateToken({ id: 1, email: 'admin@example.com', role: 'admin' });
  });

  describe('GET /api/v1/users/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('username');
    });
  });

  describe('PUT /api/v1/users/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        first_name: 'Updated',
        last_name: 'User',
        phone: '+1234567890'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.first_name).toBe(updateData.first_name);
      expect(response.body.last_name).toBe(updateData.last_name);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return specific user (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return list of users (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user (admin only)', async () => {
      await request(app)
        .delete('/api/v1/users/2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('POST /api/v1/users/:id/verify-email', () => {
    it('should send email verification', async () => {
      const response = await request(app)
        .post('/api/v1/users/1/verify-email')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/users/forgot-password', () => {
    it('should send password reset email', async () => {
      const response = await request(app)
        .post('/api/v1/users/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/users/reset-password', () => {
    it('should reset password', async () => {
      const response = await request(app)
        .post('/api/v1/users/reset-password')
        .send({
          token: 'reset-token',
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });
});