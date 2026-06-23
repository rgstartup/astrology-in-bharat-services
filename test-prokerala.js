require('dotenv').config();

async function getAccessToken() {
  const clientId = process.env.PROKERALA_CLIENT_ID;
  const clientSecret = process.env.PROKERALA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Prokerala credentials not configured');
  }

  const response = await fetch('https://api.prokerala.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });

  if (!response.ok) {
    throw new Error('Failed to obtain Prokerala access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function run() {
  const token = await getAccessToken();
  const response = await fetch('https://api.prokerala.com/v2/astrology/panchang/advanced?ayanamsa=1&datetime=2026-06-15T00:00:00%2B05:30&coordinates=28.6139,77.2090&la=hi', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
