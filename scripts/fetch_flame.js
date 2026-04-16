import axios from 'axios';
import fs from 'fs';

async function fetchFlame() {
  try {
    const res = await axios.get('https://leetcode.com/u/Build-with-Akshit/');
    fs.writeFileSync('leetcode_profile.html', res.data);
    console.log('Saved leetcode_profile.html');
  } catch(e) {
    console.error(e.message);
  }
}
fetchFlame();
