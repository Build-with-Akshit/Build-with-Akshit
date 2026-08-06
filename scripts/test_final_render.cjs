const axios = require('axios');
const fs = require('fs');

async function test() {
  const handler = (await import('../api/leetcode.js')).default;
  const req = { query: { username: 'Build-with-Akshit', theme: 'github_dark', border_radius: '20' } };
  const res = {
    setHeader: () => {},
    status: () => res,
    send: (body) => {
      fs.writeFileSync('output.svg', body);
      console.log('Saved to output.svg');
    }
  };
  await handler(req, res);
}
test();
