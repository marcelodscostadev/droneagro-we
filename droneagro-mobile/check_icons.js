const fs = require('fs');
const p = require('path');
const mciPath = p.join('.', 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'glyphmaps', 'MaterialCommunityIcons.json');
if (fs.existsSync(mciPath)) {
  const map = JSON.parse(fs.readFileSync(mciPath));
  console.log(Object.keys(map).filter(k => k.includes('drone') || k.includes('copter')));
} else {
  console.log("Not found");
}
