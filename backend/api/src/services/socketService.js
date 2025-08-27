const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { User } = require('../models');

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socket ids
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.cors.allowedOrigins,
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        if (decoded.type !== 'access') {
          return next(new Error('Invalid token type'));
        }

        const user = await User.findByPk(decoded.userId);
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handlers
    this.io.on('connection', (socket) => {
      logger.info(`User ${socket.userId} connected via socket ${socket.id}`);
      
      // Track user sockets
      this.addUserSocket(socket.userId, socket.id);
      
      // Join user-specific room
      socket.join(`user:${socket.userId}`);
      
      // Join vehicle rooms
      socket.on('join:vehicle', (vehicleId) => {
        socket.join(`vehicle:${vehicleId}`);
        logger.debug(`Socket ${socket.id} joined vehicle room: ${vehicleId}`);
      });

      // Leave vehicle rooms
      socket.on('leave:vehicle', (vehicleId) => {
        socket.leave(`vehicle:${vehicleId}`);
        logger.debug(`Socket ${socket.id} left vehicle room: ${vehicleId}`);
      });

      // Scan updates subscription
      socket.on('subscribe:scan', (scanId) => {
        socket.join(`scan:${scanId}`);
        logger.debug(`Socket ${socket.id} subscribed to scan: ${scanId}`);
      });

      socket.on('unsubscribe:scan', (scanId) => {
        socket.leave(`scan:${scanId}`);
        logger.debug(`Socket ${socket.id} unsubscribed from scan: ${scanId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`User ${socket.userId} disconnected from socket ${socket.id}`);
        this.removeUserSocket(socket.userId, socket.id);
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error(`Socket error for user ${socket.userId}:`, error);
      });
    });

    // Make io available globally for other services
    global.io = this.io;
    
    logger.info('Socket.io service initialized');
  }

  addUserSocket(userId, socketId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
  }

  removeUserSocket(userId, socketId) {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  // Emit to specific user
  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // Emit to specific scan room
  emitToScan(scanId, event, data) {
    if (this.io) {
      this.io.to(`scan:${scanId}`).emit(event, data);
    }
  }

  // Emit to specific vehicle room
  emitToVehicle(vehicleId, event, data) {
    if (this.io) {
      this.io.to(`vehicle:${vehicleId}`).emit(event, data);
    }
  }

  // Emit scan progress update
  emitScanProgress(scanId, userId, progress, status) {
    const data = {
      scanId,
      progress,
      status,
      timestamp: new Date()
    };
    
    this.emitToScan(scanId, 'scan:progress', data);
    this.emitToUser(userId, 'scan:progress', data);
  }

  // Emit scan completion
  emitScanComplete(scanId, userId, results) {
    const data = {
      scanId,
      status: 'completed',
      results,
      timestamp: new Date()
    };
    
    this.emitToScan(scanId, 'scan:complete', data);
    this.emitToUser(userId, 'scan:complete', data);
  }

  // Emit scan error
  emitScanError(scanId, userId, error) {
    const data = {
      scanId,
      status: 'failed',
      error,
      timestamp: new Date()
    };
    
    this.emitToScan(scanId, 'scan:error', data);
    this.emitToUser(userId, 'scan:error', data);
  }

  // Emit recommendation update
  emitRecommendationUpdate(userId, recommendations) {
    this.emitToUser(userId, 'recommendations:update', {
      recommendations,
      timestamp: new Date()
    });
  }

  // Emit price alert
  emitPriceAlert(userId, alert) {
    this.emitToUser(userId, 'price:alert', {
      alert,
      timestamp: new Date()
    });
  }

  // Emit project update
  emitProjectUpdate(projectId, userId, update) {
    const data = {
      projectId,
      update,
      timestamp: new Date()
    };
    
    this.emitToUser(userId, 'project:update', data);
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.userSockets.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.userSockets.has(userId);
  }

  // Get user's active sockets
  getUserSockets(userId) {
    return Array.from(this.userSockets.get(userId) || []);
  }

  // Broadcast to all users (admin only)
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Room management
  getRoomMembers(room) {
    if (!this.io) return [];
    const sockets = this.io.sockets.adapter.rooms.get(room);
    return sockets ? Array.from(sockets) : [];
  }

  getRoomCount(room) {
    return this.getRoomMembers(room).length;
  }
}

// Export singleton instance
module.exports = new SocketService();