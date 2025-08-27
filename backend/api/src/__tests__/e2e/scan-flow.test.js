const request = require('supertest');
const io = require('socket.io-client');
const path = require('path');
const fs = require('fs').promises;
const { app } = require('../../app');
const { sequelize, User, Vehicle, Scan } = require('../../models');
const { generateTokens } = require('../../middleware/auth');
const socketService = require('../../services/socketService');

describe('Scan Flow E2E Test', () => {
  let server;
  let testUser;
  let testVehicle;
  let authToken;
  let socketClient;
  const testImagePath = path.join(__dirname, '../fixtures/test-engine.jpg');

  beforeAll(async () => {
    // Start server
    await sequelize.sync({ force: true });
    server = app.listen(0);
    const port = server.address().port;
    
    // Initialize socket service
    socketService.initialize(server);

    // Create test user and vehicle
    testUser = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123!@#',
      isVerified: true,
      subscriptionTier: 'pro'
    });

    testVehicle = await Vehicle.create({
      userId: testUser.id,
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      vin: '5YJ3E1EA5KF123456',
      isPrimary: true
    });

    const tokens = generateTokens(testUser.id);
    authToken = tokens.accessToken;

    // Create test image if it doesn't exist
    const imageDir = path.dirname(testImagePath);
    await fs.mkdir(imageDir, { recursive: true });
    if (!await fs.access(testImagePath).then(() => true).catch(() => false)) {
      // Create a simple test image (1x1 pixel PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      await fs.writeFile(testImagePath, testImageBuffer);
    }

    // Connect socket client
    socketClient = io(`http://localhost:${port}`, {
      auth: { token: authToken },
      transports: ['websocket']
    });

    await new Promise((resolve) => {
      socketClient.on('connect', resolve);
    });
  });

  afterAll(async () => {
    socketClient.disconnect();
    await server.close();
    await sequelize.close();
  });

  describe('Complete Scan Flow', () => {
    let scanId;

    test('Step 1: Create scan and upload image', async () => {
      const response = await request(server)
        .post('/api/v1/scans/process')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vehicleId', testVehicle.id)
        .field('scanType', 'engine_bay')
        .field('notes', 'Test scan')
        .attach('image', testImagePath)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('scanId');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.estimatedProcessingTime).toBeGreaterThan(0);

      scanId = response.body.data.scanId;
    });

    test('Step 2: Check scan status', async () => {
      const response = await request(server)
        .get(`/api/v1/scans/${scanId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        scanId,
        status: expect.stringMatching(/pending|processing/),
        progress: expect.any(Number)
      });
    });

    test('Step 3: Receive real-time updates via WebSocket', async (done) => {
      const updates = [];
      let progressReceived = false;
      let completeReceived = false;

      // Subscribe to scan updates
      socketClient.emit('subscribe:scan', scanId);

      socketClient.on('scan:progress', (data) => {
        expect(data).toMatchObject({
          scanId,
          progress: expect.any(Number),
          status: expect.any(String)
        });
        updates.push(data);
        progressReceived = true;
      });

      socketClient.on('scan:complete', (data) => {
        expect(data).toMatchObject({
          scanId,
          status: 'completed',
          results: expect.any(Object)
        });
        completeReceived = true;

        // Verify we received both progress and completion
        expect(progressReceived).toBe(true);
        expect(updates.length).toBeGreaterThan(0);
        
        socketClient.emit('unsubscribe:scan', scanId);
        done();
      });

      socketClient.on('scan:error', (data) => {
        done(new Error(`Scan failed: ${data.error}`));
      });

      // Simulate AI service processing (in real scenario, this would be done by AI service)
      setTimeout(async () => {
        // Update scan progress
        await Scan.update(
          { 
            status: 'processing',
            progress: 50
          },
          { where: { id: scanId } }
        );
        
        socketService.emitScanProgress(scanId, testUser.id, 50, 'processing');

        // Complete scan
        setTimeout(async () => {
          const mockResults = {
            identifiedParts: [
              {
                id: '1',
                boundingBox: [100, 100, 200, 200],
                confidence: 0.95,
                partDetails: {
                  id: 'part-123',
                  name: 'K&N Cold Air Intake',
                  partNumber: 'KN-69-2543',
                  manufacturer: 'K&N',
                  category: 'Air Intake',
                  price: 299.99,
                  compatibility: 'compatible'
                }
              }
            ],
            aiAnalysisResults: {
              overallCondition: 'good',
              recommendations: ['Consider upgrading air filter']
            }
          };

          await Scan.update(
            {
              status: 'completed',
              progress: 100,
              identifiedParts: mockResults.identifiedParts,
              aiAnalysisResults: mockResults.aiAnalysisResults,
              processingCompletedAt: new Date()
            },
            { where: { id: scanId } }
          );

          socketService.emitScanComplete(scanId, testUser.id, mockResults);
        }, 500);
      }, 500);
    }, 10000);

    test('Step 4: Get complete scan results', async () => {
      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(server)
        .get(`/api/v1/scans/${scanId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: scanId,
        status: 'completed',
        scanType: 'engine_bay',
        userId: testUser.id,
        vehicleId: testVehicle.id,
        progress: 100,
        identifiedParts: expect.arrayContaining([
          expect.objectContaining({
            confidence: expect.any(Number),
            partDetails: expect.any(Object)
          })
        ])
      });
    });

    test('Step 5: Submit feedback on scan results', async () => {
      const feedback = {
        accuracy: 4,
        misidentifiedParts: [],
        missedParts: ['turbocharger'],
        comments: 'Good accuracy but missed the turbo'
      };

      const response = await request(server)
        .post(`/api/v1/scans/${scanId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(feedback)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify feedback was saved
      const scan = await Scan.findByPk(scanId);
      expect(scan.feedback).toMatchObject(feedback);
    });
  });

  describe('Error Handling', () => {
    test('Should handle scan creation without image', async () => {
      const response = await request(server)
        .post('/api/v1/scans/process')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vehicleId', testVehicle.id)
        .field('scanType', 'engine_bay')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_IMAGE');
    });

    test('Should handle scan creation for non-owned vehicle', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: 'Test123!@#',
        isVerified: true
      });

      const otherVehicle = await Vehicle.create({
        userId: otherUser.id,
        make: 'Ford',
        model: 'Mustang',
        year: 2023
      });

      const response = await request(server)
        .post('/api/v1/scans/process')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vehicleId', otherVehicle.id)
        .field('scanType', 'engine_bay')
        .attach('image', testImagePath)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND');
    });

    test('Should handle retry for failed scan', async () => {
      // Create a failed scan
      const failedScan = await Scan.create({
        userId: testUser.id,
        vehicleId: testVehicle.id,
        scanType: 'engine_bay',
        imageUrl: 'https://example.com/image.jpg',
        status: 'failed',
        error: 'Processing failed'
      });

      const response = await request(server)
        .post(`/api/v1/scans/${failedScan.id}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');

      // Verify scan was reset
      await failedScan.reload();
      expect(failedScan.status).toBe('pending');
      expect(failedScan.error).toBeNull();
    });
  });

  describe('Scan History and Stats', () => {
    beforeEach(async () => {
      // Create multiple scans
      await Scan.bulkCreate([
        {
          userId: testUser.id,
          vehicleId: testVehicle.id,
          scanType: 'engine_bay',
          imageUrl: 'https://example.com/scan1.jpg',
          status: 'completed',
          progress: 100
        },
        {
          userId: testUser.id,
          vehicleId: testVehicle.id,
          scanType: 'exterior',
          imageUrl: 'https://example.com/scan2.jpg',
          status: 'completed',
          progress: 100
        },
        {
          userId: testUser.id,
          vehicleId: testVehicle.id,
          scanType: 'vin',
          imageUrl: 'https://example.com/scan3.jpg',
          status: 'failed',
          error: 'Could not read VIN'
        }
      ]);
    });

    test('Should get user scan history', async () => {
      const response = await request(server)
        .get('/api/v1/scans/my-scans')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, page: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4); // 3 + 1 from previous test
      expect(response.body.pagination).toMatchObject({
        total: 4,
        page: 1,
        limit: 10
      });

      // Verify scans include vehicle info
      response.body.data.forEach(scan => {
        expect(scan.vehicle).toMatchObject({
          id: testVehicle.id,
          make: testVehicle.make,
          model: testVehicle.model
        });
      });
    });

    test('Should filter scans by type', async () => {
      const response = await request(server)
        .get('/api/v1/scans/my-scans')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scanType: 'engine_bay' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach(scan => {
        expect(scan.scanType).toBe('engine_bay');
      });
    });

    test('Should get scan statistics', async () => {
      const response = await request(server)
        .get('/api/v1/scans/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        total: expect.any(Number),
        byType: expect.objectContaining({
          engine_bay: expect.objectContaining({
            count: expect.any(Number),
            successRate: expect.any(Number)
          })
        }),
        last30Days: expect.any(Array)
      });
    });
  });
});