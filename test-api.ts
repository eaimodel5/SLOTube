fetch('http://localhost:3000/api/health').then(r => r.json()).then(console.log).catch(console.error);
fetch('http://localhost:3000/api/goals').then(r => r.json()).then(d => console.log('Goals loaded:', d.length)).catch(console.error);
