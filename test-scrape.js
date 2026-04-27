import fetch from 'node-fetch';

async function test() {
  const q = "https://nos.nl";
  const res = await fetch('http://localhost:3000/api/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: q })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}

test();
