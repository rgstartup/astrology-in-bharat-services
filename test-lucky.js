require('dotenv').config();

async function getAccessToken() {
  const clientId = process.env.PROKERALA_CLIENT_ID;
  const clientSecret = process.env.PROKERALA_CLIENT_SECRET;

  const response = await fetch('https://api.prokerala.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });
  const data = await response.json();
  return data.access_token;
}

async function run() {
  const token = await getAccessToken();
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

  // 1. Try Auspicious Period
  console.log("--- Auspicious Period ---");
  try {
    const res = await fetch('https://api.prokerala.com/v2/astrology/auspicious-period?datetime=2026-06-26T00:00:00%2B05:30&coordinates=28.6139,77.2090', { headers });
    console.log(JSON.stringify(await res.json(), null, 2));
  } catch (e) { console.error(e); }

  // 2. Try Numerology Profile
  console.log("--- Numerology Profile ---");
  try {
    const res = await fetch('https://api.prokerala.com/v2/astrology/numerology/profile?datetime=1990-01-01T00:00:00%2B05:30&system=pythagorean', { headers });
    console.log(JSON.stringify(await res.json(), null, 2));
  } catch (e) { console.error(e); }
}
run().catch(console.error);
