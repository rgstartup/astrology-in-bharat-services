const http = require('http');

function checkEndpoint() {
  const options = {
    hostname: 'localhost',
    port: 6543,
    path: '/api/v1/merchant/finance/stats',
    method: 'GET',
    headers: {
      // I don't have a valid JWT easily reachable, but even a 401 proves the server is UP.
      // A 500 would mean it's still crashing in the logic.
    }
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    if (res.statusCode === 500) {
      console.log('Server still returning 500');
    } else if (res.statusCode === 401) {
      console.log('Server is UP (Unauthorized is expected without JWT)');
    } else {
      console.log(`Received status: ${res.statusCode}`);
    }
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.end();
}

checkEndpoint();
