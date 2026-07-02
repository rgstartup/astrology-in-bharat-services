const http = require("http");
http.get("http://localhost:3000/api/v1/chat/session/e2cd6a27-db56-4c96-aba6-302a2ec96781", (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => console.log(data));
}).on("error", (err) => console.log("Error: " + err.message));
