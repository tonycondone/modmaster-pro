const config = require('./src/config');

module.exports = {
  development: {
    client: 'pg',
    connection: config.database,
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  staging: {
    client: 'pg',
    connection: config.database,
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  production: {
    client: 'pg',
    connection: config.database,
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    pool: {
      min: 5,
      max: 20,
    },
  },

  test: {
    client: 'pg',
    connection: process.env.TEST_DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      database: 'modmaster_pro_test',
      user: 'modmaster_user',
      password: 'modmaster_password',
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