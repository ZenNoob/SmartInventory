import dotenv from 'dotenv';
dotenv.config();

import { query } from '../src/db';

async function run() {
  console.log('Checking OnlineProducts columns...');
  const cols = await query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'OnlineProducts' ORDER BY ORDINAL_POSITION`
  );
  console.log('OnlineProducts columns:');
  cols.forEach((c: any) => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

  process.exit(0);
}

run().catch(console.error);
