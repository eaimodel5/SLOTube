import fetch from 'node-fetch';

async function test() {
  const q = "nos";
  const res = await fetch('http://localhost:3000/api/youtube/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ queries: [q], maxResultsPerQuery: 5 })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}

test();
