require('dotenv').config();

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'modmaster_pro',
      user: process.env.POSTGRES_USER || 'modmaster_user',
      password: process.env.POSTGRES_PASSWORD || (() => {
        throw new Error('POSTGRES_PASSWORD environment variable is required for security');
      })(),
      ssl: process.env.POSTGRES_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.TEST_POSTGRES_HOST || 'localhost',
      port: process.env.TEST_POSTGRES_PORT || 5432,
      database: process.env.TEST_POSTGRES_DB || 'modmaster_pro_test',
      user: process.env.TEST_POSTGRES_USER || 'modmaster_user',
      password: process.env.TEST_POSTGRES_PASSWORD || (() => {
        throw new Error('TEST_POSTGRES_PASSWORD environment variable is required for security');
      })(),
      ssl: false,
    },
    pool: {
      min: 1,
      max: 5,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || (() => {
      throw new Error('DATABASE_URL environment variable is required for production');
    })(),
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },
};