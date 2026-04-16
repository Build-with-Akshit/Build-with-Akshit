import axios from 'axios';
import fs from 'fs';

async function fetchRef() {
  try {
    const res = await axios.get('https://github-readme-leetcode-stats.vercel.app/api/card?username=blackscythe123');
    fs.writeFileSync('ref_card.svg', res.data);
    console.log('Saved ref_card.svg');
  } catch(e) {
    console.error(e.message);
  }
}
fetchRef();
