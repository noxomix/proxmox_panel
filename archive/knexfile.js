export default {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'proxmox_panel'
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },

  test: {
    client: 'mysql2',
    connection: {
      host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || process.env.DB_PORT || 3306,
      user: process.env.TEST_DB_USER || process.env.DB_USER || 'root',
      password: process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.TEST_DB_DATABASE || 'proxmox_panel_test'
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },

  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'proxmox_panel'
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
};