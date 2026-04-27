import "dotenv/config";

async function testApiKey() {
  try {
    const resp = await fetch("http://localhost:3000/api/youtube/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries: ["test"] })
    });
    const data = await resp.json();
    console.log("Status:", resp.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testApiKey();
