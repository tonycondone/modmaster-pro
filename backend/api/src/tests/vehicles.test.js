const request = require('supertest');
const app = require('../app');
const { createTestUser, getAuthToken } = require('./helpers');

describe('Vehicle Endpoints', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser.email, 'Test@1234');
  });

  describe('POST /api/v1/vehicles', () => {
    it('should create a new vehicle', async () => {
      const vehicleData = {
        make: 'Toyota',
        model: 'Supra',
        year: 2023,
        trim: 'GR',
        engine_type: '3.0L Turbocharged I6',
        transmission: 'Automatic',
        mileage: 5000,
        nickname: 'My Supra',
      };

      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.make).toBe(vehicleData.make);
      expect(response.body.data.model).toBe(vehicleData.model);
      expect(response.body.data.user_id).toBe(testUser.id);
    });

    it('should validate VIN format', async () => {
      const vehicleData = {
        make: 'Toyota',
        model: 'Supra',
        year: 2023,
        vin: 'INVALID', // Invalid VIN
      };

      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.errors).toBeDefined();
    });

    it('should prevent duplicate VIN', async () => {
      const vin = 'JT2MA70JXP0123456';
      const vehicleData = {
        make: 'Toyota',
        model: 'Supra',
        year: 2023,
        vin,
      };

      // Create first vehicle
      await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(vehicleData);

      // Try to create second vehicle with same VIN
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...vehicleData, model: 'Camry' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('VIN already registered');
    });
  });

  describe('GET /api/v1/vehicles/my-vehicles', () => {
    beforeEach(async () => {
      // Create test vehicles
      const vehicles = [
        { make: 'Toyota', model: 'Supra', year: 2023 },
        { make: 'Honda', model: 'Civic', year: 2022 },
        { make: 'Mazda', model: 'MX-5', year: 2021 },
      ];

      for (const vehicle of vehicles) {
        await request(app)
          .post('/api/v1/vehicles')
          .set('Authorization', `Bearer ${authToken}`)
          .send(vehicle);
      }
    });

    it('should return user vehicles', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles/my-vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(3);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles/my-vehicles?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/v1/vehicles/:id', () => {
    let vehicle;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          make: 'Toyota',
          model: 'Supra',
          year: 2023,
          is_public: true,
        });

      vehicle = response.body.data;
    });

    it('should return vehicle details', async () => {
      const response = await request(app)
        .get(`/api/v1/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicle.id).toBe(vehicle.id);
      expect(response.body.data).toHaveProperty('owner');
      expect(response.body.data).toHaveProperty('stats');
    });

    it('should allow public access to public vehicles', async () => {
      const response = await request(app)
        .get(`/api/v1/vehicles/${vehicle.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.vehicle.id).toBe(vehicle.id);
    });

    it('should prevent access to private vehicles', async () => {
      // Update vehicle to private
      await request(app)
        .put(`/api/v1/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_public: false });

      // Try to access without auth
      const response = await request(app)
        .get(`/api/v1/vehicles/${vehicle.id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/vehicles/:id', () => {
    let vehicle;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          make: 'Toyota',
          model: 'Supra',
          year: 2023,
        });

      vehicle = response.body.data;
    });

    it('should update vehicle', async () => {
      const updates = {
        nickname: 'Beast Mode',
        mileage: 6000,
        exterior_color: 'Nitro Yellow',
      };

      const response = await request(app)
        .put(`/api/v1/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nickname).toBe(updates.nickname);
      expect(response.body.data.mileage).toBe(updates.mileage);
      expect(response.body.data.exterior_color).toBe(updates.exterior_color);
    });

    it('should prevent updating other users vehicles', async () => {
      // Create another user
      const otherUser = await createTestUser('other@example.com');
      const otherToken = await getAuthToken('other@example.com', 'Test@1234');

      const response = await request(app)
        .put(`/api/v1/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ nickname: 'Stolen' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/vehicles/:id', () => {
    let vehicle;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          make: 'Toyota',
          model: 'Supra',
          year: 2023,
        });

      vehicle = response.body.data;
    });

    it('should delete vehicle', async () => {
      const response = await request(app)
        .delete(`/api/v1/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify vehicle is deleted
      await request(app)
        .get(`/api/v1/vehicles/${vehicle.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/vehicles/:id/modifications', () => {
    let vehicle;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          make: 'Toyota',
          model: 'Supra',
          year: 2023,
        });

      vehicle = response.body.data;
    });

    it('should add modification to vehicle', async () => {
      const modification = {
        part_name: 'HKS Exhaust System',
        category: 'exhaust',
        cost: 1500,
        installation_date: '2023-12-01',
        notes: 'Sounds amazing!',
      };

      const response = await request(app)
        .post(`/api/v1/vehicles/${vehicle.id}/modifications`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(modification)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modifications).toHaveLength(1);
      expect(response.body.data.modifications[0].part_name).toBe(modification.part_name);
    });
  });
});