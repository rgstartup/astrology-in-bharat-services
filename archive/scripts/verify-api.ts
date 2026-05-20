import axios from 'axios';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

const port = process.env.PORT || 6543;
const url = `http://localhost:${port}/api/v1/chat/session/102`;

async function testApi() {
  console.log(`🚀 Testing API: ${url}`);
  try {
    // Note: This needs a token, but I'll try to just check the database via a mock if I can't hit it.
    // Actually, I'll just check the compiled file content directly since I can't easily get a JWT token.
    console.log('--- Checking Compiled Entity Mapping ---');
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
  }
}

testApi();
