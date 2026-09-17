const fs = require('fs');
let code = fs.readFileSync('src/lib/realtime.tsx', 'utf8');
code = code.replace(
  "import { \n  Semester",
  `import { collection, query, where, onSnapshot, Unsubscribe, orderBy } from 'firebase/firestore';
import { db, auth } from './firebase';
import { User } from 'firebase/auth';
import { initAuth, getAccessToken } from './auth';\nimport { \n  Semester`
);
fs.writeFileSync('src/lib/realtime.tsx', code);
