import fs from 'fs';
let code = fs.readFileSync('src/components/HomeDashboard.tsx', 'utf8');

if (!code.includes('GoogleCalendarConnect')) {
  // Add imports
  code = code.replace(
    /import \{ useSOMA \} from '\.\.\/lib\/realtime';/,
    `import { useSOMA } from '../lib/realtime';\nimport { GoogleCalendarConnect } from './GoogleCalendarConnect';\nimport { UpcomingEvents } from './UpcomingEvents';`
  );

  // Add components to the sidebar
  code = code.replace(
    /\{\/\* Sidebar \*\/\}\n\s*<div className="space-y-6">/,
    `{/* Sidebar */}\n        <div className="space-y-6">\n          <GoogleCalendarConnect />\n          <UpcomingEvents />`
  );

  fs.writeFileSync('src/components/HomeDashboard.tsx', code);
}
