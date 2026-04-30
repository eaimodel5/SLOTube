import * as fs from 'fs';
const envKeys = Object.keys(process.env).filter(k => k.toLowerCase().includes('you'));
console.log(envKeys);
