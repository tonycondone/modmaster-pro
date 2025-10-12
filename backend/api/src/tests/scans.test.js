const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../middleware/auth');

describe('Scan Controller', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateToken({ id: 1, email: 'test@example.com' });
  });

  describe('GET /api/v1/scans', () => {
    it('should return list of scans', async () => {
      const response = await request(app)
        .get('/api/v1/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/v1/scans', () => {
    it('should create a new scan', async () => {
      const scanData = {
        vehicle_id: 1,
        scan_type: 'diagnostic',
        image_url: 'https://example.com/scan.jpg',
        notes: 'Engine scan for potential issues'
      };

      const response = await request(app)
        .post('/api/v1/scans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.vehicle_id).toBe(scanData.vehicle_id);
      expect(response.body.scan_type).toBe(scanData.scan_type);
    });
  });

  describe('GET /api/v1/scans/:id', () => {
    it('should return specific scan', async () => {
      const response = await request(app)
        .get('/api/v1/scans/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
    });
  });

  describe('PUT /api/v1/scans/:id', () => {
    it('should update scan', async () => {
      const updateData = {
        status: 'completed',
        results: 'No issues found in engine scan'
      };

      const response = await request(app)
        .put('/api/v1/scans/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe(updateData.status);
    });
  });

  describe('DELETE /api/v1/scans/:id', () => {
    it('should delete scan', async () => {
      await request(app)
        .delete('/api/v1/scans/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('POST /api/v1/scans/:id/analyze', () => {
    it('should analyze scan image', async () => {
      const response = await request(app)
        .post('/api/v1/scans/1/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('confidence');
    });
  });

  describe('GET /api/v1/scans/:id/results', () => {
    it('should return scan results', async () => {
      const response = await request(app)
        .get('/api/v1/scans/1/results')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('scan_id', 1);
      expect(response.body).toHaveProperty('results');
    });
  });
});