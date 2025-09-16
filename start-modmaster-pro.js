#!/usr/bin/env node

/**
 * ModMaster Pro - Complete Startup Script
 * This script fixes all common issues and starts the application properly
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ModMasterProStarter {
  constructor() {
    this.projectRoot = __dirname;
    this.services = {
      database: { running: false, port: 5432 },
      redis: { running: false, port: 6379 },
      backend: { running: false, port: 3000 },
      ai: { running: false, port: 8001 },
      mobile: { running: false, port: 19000 }
    };
    this.logs = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.logs.push(logMessage);
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const netstat = spawn('netstat', ['-an'], { shell: true });
      let output = '';
      
      netstat.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      netstat.on('close', () => {
        resolve(output.includes(`:${port}`));
      });
      
      netstat.on('error', () => {
        resolve(false);
      });
    });
  }

  async checkDockerContainers() {
    return new Promise((resolve) => {
      exec('docker ps --format "table {{.Names}}\t{{.Status}}"', (error, stdout) => {
        if (error) {
          resolve({ postgres: false, redis: false });
          return;
        }
        
        const containers = {
          postgres: stdout.includes('modmaster-postgres') && stdout.includes('Up'),
          redis: stdout.includes('modmaster-redis') && stdout.includes('Up')
        };
        
        resolve(containers);
      });
    });
  }

  async startDockerServices() {
    this.log('Starting Docker services...');
    
    const containers = await this.checkDockerContainers();
    
    if (!containers.postgres || !containers.redis) {
      this.log('Starting PostgreSQL and Redis containers...');
      
      return new Promise((resolve, reject) => {
        const dockerCompose = spawn('docker-compose', ['up', 'postgres', 'redis', '-d'], {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });
        
        dockerCompose.stdout.on('data', (data) => {
          this.log(`Docker: ${data.toString().trim()}`);
        });
        
        dockerCompose.stderr.on('data', (data) => {
          this.log(`Docker Error: ${data.toString().trim()}`, 'error');
        });
        
        dockerCompose.on('close', (code) => {
          if (code === 0) {
            this.log('Docker services started successfully');
            resolve();
          } else {
            this.log('Failed to start Docker services', 'error');
            reject(new Error('Docker services failed to start'));
          }
        });
      });
    } else {
      this.log('Docker services already running');
    }
  }

  async installBackendDependencies() {
    this.log('Installing backend dependencies...');
    
    const backendPath = path.join(this.projectRoot, 'backend', 'api');
    
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], {
        cwd: backendPath,
        stdio: 'pipe'
      });
      
      npm.stdout.on('data', (data) => {
        this.log(`NPM: ${data.toString().trim()}`);
      });
      
      npm.stderr.on('data', (data) => {
        this.log(`NPM Error: ${data.toString().trim()}`, 'error');
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          this.log('Backend dependencies installed successfully');
          resolve();
        } else {
          this.log('Failed to install backend dependencies', 'error');
          reject(new Error('NPM install failed'));
        }
      });
    });
  }

  async runDatabaseMigrations() {
    this.log('Running database migrations...');
    
    const backendPath = path.join(this.projectRoot, 'backend', 'api');
    
    return new Promise((resolve, reject) => {
      const migrate = spawn('npm', ['run', 'migrate'], {
        cwd: backendPath,
        stdio: 'pipe'
      });
      
      migrate.stdout.on('data', (data) => {
        this.log(`Migration: ${data.toString().trim()}`);
      });
      
      migrate.stderr.on('data', (data) => {
        this.log(`Migration Error: ${data.toString().trim()}`, 'error');
      });
      
      migrate.on('close', (code) => {
        if (code === 0) {
          this.log('Database migrations completed successfully');
          resolve();
        } else {
          this.log('Database migrations failed', 'error');
          reject(new Error('Migration failed'));
        }
      });
    });
  }

  async startBackendService() {
    this.log('Starting backend service...');
    
    const backendPath = path.join(this.projectRoot, 'backend', 'api');
    
    return new Promise((resolve, reject) => {
      const backend = spawn('npm', ['run', 'dev'], {
        cwd: backendPath,
        stdio: 'pipe',
        detached: true
      });
      
      backend.stdout.on('data', (data) => {
        const output = data.toString().trim();
        this.log(`Backend: ${output}`);
        
        if (output.includes('Server running on port')) {
          this.services.backend.running = true;
          this.log('Backend service started successfully');
          resolve();
        }
      });
      
      backend.stderr.on('data', (data) => {
        this.log(`Backend Error: ${data.toString().trim()}`, 'error');
      });
      
      backend.on('error', (error) => {
        this.log(`Backend startup error: ${error.message}`, 'error');
        reject(error);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!this.services.backend.running) {
          this.log('Backend service startup timeout', 'error');
          reject(new Error('Backend startup timeout'));
        }
      }, 30000);
    });
  }

  async startMobileApp() {
    this.log('Starting mobile app...');
    
    const mobilePath = path.join(this.projectRoot, 'mobile-app');
    
    return new Promise((resolve, reject) => {
      const mobile = spawn('npx', ['expo', 'start'], {
        cwd: mobilePath,
        stdio: 'pipe',
        detached: true
      });
      
      mobile.stdout.on('data', (data) => {
        const output = data.toString().trim();
        this.log(`Mobile: ${output}`);
        
        if (output.includes('Metro waiting on')) {
          this.services.mobile.running = true;
          this.log('Mobile app started successfully');
          resolve();
        }
      });
      
      mobile.stderr.on('data', (data) => {
        this.log(`Mobile Error: ${data.toString().trim()}`, 'error');
      });
      
      mobile.on('error', (error) => {
        this.log(`Mobile startup error: ${error.message}`, 'error');
        reject(error);
      });
      
      // Timeout after 60 seconds
      setTimeout(() => {
        if (!this.services.mobile.running) {
          this.log('Mobile app startup timeout', 'error');
          reject(new Error('Mobile startup timeout'));
        }
      }, 60000);
    });
  }

  async testServices() {
    this.log('Testing services...');
    
    const tests = [
      { name: 'Backend Health', url: 'http://localhost:3000/api/health' },
      { name: 'Backend Test', url: 'http://localhost:3000/api/test' }
    ];
    
    for (const test of tests) {
      try {
        const response = await fetch(test.url);
        if (response.ok) {
          const data = await response.json();
          this.log(`${test.name}: ✅ ${data.message || 'OK'}`);
        } else {
          this.log(`${test.name}: ❌ HTTP ${response.status}`, 'error');
        }
      } catch (error) {
        this.log(`${test.name}: ❌ ${error.message}`, 'error');
      }
    }
  }

  async generateStatusReport() {
    this.log('Generating status report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      services: this.services,
      logs: this.logs,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: os.totalmem(),
        freeMemory: os.freemem()
      }
    };
    
    await fs.writeFile(
      path.join(this.projectRoot, 'startup-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    this.log('Status report saved to startup-report.json');
  }

  async start() {
    try {
      this.log('🚀 Starting ModMaster Pro...');
      
      // Step 1: Start Docker services
      await this.startDockerServices();
      
      // Step 2: Install dependencies
      await this.installBackendDependencies();
      
      // Step 3: Run migrations
      await this.runDatabaseMigrations();
      
      // Step 4: Start backend service
      await this.startBackendService();
      
      // Step 5: Test services
      await this.testServices();
      
      // Step 6: Start mobile app (optional)
      try {
        await this.startMobileApp();
      } catch (error) {
        this.log('Mobile app startup failed, continuing without it', 'warn');
      }
      
      // Step 7: Generate report
      await this.generateStatusReport();
      
      this.log('🎉 ModMaster Pro started successfully!');
      this.log('📊 Backend API: http://localhost:3000');
      this.log('📱 Mobile App: Check Expo CLI for QR code');
      this.log('🗄️ Database: PostgreSQL on port 5432');
      this.log('⚡ Cache: Redis on port 6379');
      
    } catch (error) {
      this.log(`❌ Startup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Start the application
if (require.main === module) {
  const starter = new ModMasterProStarter();
  starter.start();
}

module.exports = ModMasterProStarter;