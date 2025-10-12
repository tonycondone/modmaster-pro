const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../middleware/auth');

describe('Payment Controller', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateToken({ id: 1, email: 'test@example.com' });
  });

  describe('POST /api/v1/payments/create-intent', () => {
    it('should create payment intent', async () => {
      const paymentData = {
        amount: 99.99,
        currency: 'usd',
        items: [
          {
            name: 'Premium Scan Analysis',
            price: 99.99,
            quantity: 1
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/payments/create-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('client_secret');
      expect(response.body).toHaveProperty('payment_intent_id');
    });
  });

  describe('GET /api/v1/payments/history', () => {
    it('should return payment history', async () => {
      const response = await request(app)
        .get('/api/v1/payments/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('should handle stripe webhook', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 9999,
            currency: 'usd'
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body).toHaveProperty('received', true);
    });
  });

  describe('POST /api/v1/payments/refund', () => {
    it('should process refund', async () => {
      const refundData = {
        payment_intent_id: 'pi_test_123',
        amount: 50.00,
        reason: 'requested_by_customer'
      };

      const response = await request(app)
        .post('/api/v1/payments/refund')
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(200);

      expect(response.body).toHaveProperty('refund_id');
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('GET /api/v1/payments/invoices/:id', () => {
    it('should return invoice', async () => {
      const response = await request(app)
        .get('/api/v1/payments/invoices/inv_123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('invoice_id');
      expect(response.body).toHaveProperty('amount');
    });
  });
});