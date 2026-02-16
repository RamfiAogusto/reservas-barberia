/**
 * Script para crear la base de datos local de PostgreSQL.
 * Usar cuando PostgreSQL está instalado localmente (sin Docker).
 *
 * Requiere: PostgreSQL corriendo en localhost:5432
 * Usuario por defecto: postgres / postgres
 *
 * Ejecutar: node scripts/setup-local-db.js
 */

require('dotenv').config();
const { Client } = require('pg');

const DB_NAME = 'reservas_barberia';
const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 5432;

/** Parsea credenciales desde DATABASE_URL o variables de entorno */
const getCredentials = () => {
  if (process.env.PGPASSWORD) {
    return {
      host: process.env.PGHOST || DEFAULT_HOST,
      port: process.env.PGPORT || DEFAULT_PORT,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
    };
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)/);
    if (match) {
      return {
        host: match[3],
        port: parseInt(match[4], 10),
        user: match[1],
        password: match[2],
      };
    }
  }
  return null;
};

const createDatabase = async () => {
  const creds = getCredentials();
  if (!creds) {
    console.error('❌ Configura PGPASSWORD en .env o usa DATABASE_URL con la contraseña correcta');
    process.exit(1);
  }

  const client = new Client({
    ...creds,
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');

    // Verificar si la base de datos ya existe
    const checkResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB_NAME]
    );

    if (checkResult.rows.length > 0) {
      console.log(`ℹ️  La base de datos '${DB_NAME}' ya existe`);
      return;
    }

    // Crear la base de datos
    await client.query(`CREATE DATABASE ${DB_NAME}`);
    console.log(`✅ Base de datos '${DB_NAME}' creada exitosamente`);

    console.log('\n📋 Próximos pasos:');
    console.log('   1. Ejecuta las migraciones: npm run force-migrate');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

createDatabase();
