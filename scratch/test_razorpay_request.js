const keyId = 'rzp_test_S9yfsaBsYbeDAU';
const keySecret = '1xpe52ZUP7K6O3Qera0pifCK';
const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

async function test() {
  console.log('Testing RazorpayX Contact Creation...');
  try {
    const response = await fetch('https://api.razorpay.com/v1/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        contact: '9999999999',
        type: 'vendor',
        reference_id: 'TEST-123',
      }),
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
