import fs from 'fs';
import bluebird from 'bluebird';
import parse from 'connection-string';
import mysql from 'mysql';
import Connection from 'mysql/lib/Connection';
import Pool from 'mysql/lib/Pool';
import dotenv from 'dotenv';
dotenv.config();

// @ts-ignore
const config = parse(process.env.DATABASE_URL);
config.connectionLimit = 5;
config.host = config.hosts[0].name;
config.port = config.hosts[0].port;
bluebird.promisifyAll([Pool, Connection]);
const db = mysql.createPool(config);
const dbName = config.path[0];

async function run() {
  const splitToken = ');';

  console.log('Start test database setup');  
  console.info(`- Creating new database: ${dbName}`);
  await db.queryAsync(`CREATE DATABASE IF NOT EXISTS ${dbName}`);

  const schema = fs
    .readFileSync('./src/helpers/schema.sql', 'utf8')
    .replaceAll('CREATE TABLE ', `CREATE TABLE IF NOT EXISTS ${dbName}.`)
    .split(splitToken)
    .filter(s => s.trim().length > 0);

  console.info(`- Importing the schema (${schema.length} tables)`);

  for (const statement of schema) {
    await db.queryAsync(`${statement}${splitToken}`);
  }
}

(async () => {
  try {
    await run();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
