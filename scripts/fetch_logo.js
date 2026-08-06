import axios from 'axios';
import fs from 'fs';

async function fetchLogo() {
  try {
    const res = await axios.get('https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/leetcode.svg');
    fs.writeFileSync('leetcode_logo.svg', res.data);
    console.log('Saved leetcode_logo.svg');
  } catch(e) {
    console.error(e.message);
  }
}
fetchLogo();
