const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../middleware/auth');

describe('Parts Controller', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateToken({ id: 1, email: 'test@example.com' });
  });

  describe('GET /api/v1/parts', () => {
    it('should return list of parts', async () => {
      const response = await request(app)
        .get('/api/v1/parts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter parts by category', async () => {
      const response = await request(app)
        .get('/api/v1/parts?category=engine')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/v1/parts', () => {
    it('should create a new part', async () => {
      const partData = {
        name: 'Engine Oil Filter',
        category: 'engine',
        part_number: 'FL-910S',
        manufacturer: 'FRAM',
        price: 15.99,
        compatibility: ['Toyota Camry 2020']
      };

      const response = await request(app)
        .post('/api/v1/parts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(partData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(partData.name);
      expect(response.body.category).toBe(partData.category);
    });
  });

  describe('GET /api/v1/parts/:id', () => {
    it('should return specific part', async () => {
      const response = await request(app)
        .get('/api/v1/parts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
    });
  });

  describe('PUT /api/v1/parts/:id', () => {
    it('should update part', async () => {
      const updateData = {
        price: 18.99,
        description: 'High quality engine oil filter'
      };

      const response = await request(app)
        .put('/api/v1/parts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.price).toBe(updateData.price);
    });
  });

  describe('DELETE /api/v1/parts/:id', () => {
    it('should delete part', async () => {
      await request(app)
        .delete('/api/v1/parts/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('GET /api/v1/parts/compatibility/:vehicleId', () => {
    it('should return compatible parts for vehicle', async () => {
      const response = await request(app)
        .get('/api/v1/parts/compatibility/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});