// Script to generate an RSA private key and save it to server/keys/private.key
// Usage: node generatePrivateKey.js

const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');

const keysDir = path.join(__dirname, 'keys');
const privateKeyPath = path.join(keysDir, 'private.key');
const publicKeyPath = path.join(keysDir, 'public.key');

// Ensure keys directory exists
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir);
}

// Generate RSA private key
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem',
  },
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  publicKeyEncoding: {
    type: 'pkcs1',
    format: 'pem',
  },
});

// Write private key to file
fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);
console.log('RSA private key generated at:', privateKeyPath);
console.log('RSA public key generated at:', publicKeyPath);


// Write private key to file
fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, publicKey);
console.log('RSA private key generated at:', privateKeyPath);
console.log('RSA public key generated at:', publicKeyPath);
