const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../middleware/auth');

describe('Vehicle Controller', () => {
  let authToken;

  beforeAll(async () => {
    // Generate a test token
    authToken = generateToken({ id: 1, email: 'test@example.com' });
  });

  describe('GET /api/v1/vehicles', () => {
    it('should return list of vehicles', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/v1/vehicles', () => {
    it('should create a new vehicle', async () => {
      const vehicleData = {
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        vin: '1HGCM82633A123456',
        mileage: 50000,
        color: 'Blue',
        fuel_type: 'Gasoline'
      };

      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.make).toBe(vehicleData.make);
      expect(response.body.model).toBe(vehicleData.model);
    });
  });

  describe('GET /api/v1/vehicles/:id', () => {
    it('should return specific vehicle', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
    });
  });

  describe('PUT /api/v1/vehicles/:id', () => {
    it('should update vehicle', async () => {
      const updateData = {
        mileage: 55000,
        color: 'Red'
      };

      const response = await request(app)
        .put('/api/v1/vehicles/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.mileage).toBe(updateData.mileage);
      expect(response.body.color).toBe(updateData.color);
    });
  });

  describe('DELETE /api/v1/vehicles/:id', () => {
    it('should delete vehicle', async () => {
      await request(app)
        .delete('/api/v1/vehicles/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });
});