const axios = require('axios');

async function checkApi() {
  try {
    // Note: We need a valid token to call this, but we can check if the field exists in the code
    // Since I can't easily get a token here, I'll check the service file and controller logic again.
    console.log("Checking if the field exists in the service...");
  } catch (err) {
    console.error(err);
  }
}
checkApi();
