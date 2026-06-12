const fs = require('fs');
fs.writeFileSync(
  'app/api/auth/[kindeAuth]/route.js',
  'import {handleAuth} from "@kinde-oss/kinde-auth-nextjs/server";\nexport const GET = handleAuth();'
);
console.log('Done!');