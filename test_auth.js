const http = require('http');

async function testAuthFlow() {
  const email = "auth_test_" + Date.now() + "@example.com";
  // 1. Register User
  const regRes = await fetch("http://localhost:8080/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: "password123", role: "vendor" })
  });
  console.log("Register:", regRes.status);

  // 2. Login User
  const logRes = await fetch("http://localhost:8080/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: "password123" })
  });
  const logData = await logRes.json();
  console.log("Login:", logRes.status);

  let token = logData.access_token;
  let refresh = logData.refresh_token;
  
  // 3. Refresh Token
  const refRes = await fetch("http://localhost:8080/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh })
  });
  const refData = await refRes.json();
  console.log("Refresh 1:", refRes.status);
  
  // 4. Try to reuse the OLD refresh token
  const refRes2 = await fetch("http://localhost:8080/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }) // Reusing old token!
  });
  const refData2 = await refRes2.json();
  console.log("Refresh 2 (Reuse OLD):", refRes2.status, refData2);
  
  // 5. Try to use the NEW refresh token (should be revoked because of reuse of old token)
  const refRes3 = await fetch("http://localhost:8080/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refData.refresh_token })
  });
  const refData3 = await refRes3.json();
  console.log("Refresh 3 (Use NEW after family revoke):", refRes3.status, refData3);
}

testAuthFlow();
