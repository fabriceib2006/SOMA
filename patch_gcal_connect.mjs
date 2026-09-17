import fs from 'fs';
let code = fs.readFileSync('src/components/GoogleCalendarConnect.tsx', 'utf8');

code = code.replace(
  /const \{ syncGoogleCalendar \} = useSOMA\(\);/,
  `import { syncGoogleEventsToSOMA } from '../lib/calendarSync';\n  const { user } = useSOMA();\n  const syncGoogleCalendar = async () => {\n    if (user) await syncGoogleEventsToSOMA(user.uid);\n  };`
);

// fix import position if needed, since import should be at top
code = code.replace(
  /import \{ useSOMA \} from '\.\.\/lib\/realtime';/,
  `import { useSOMA } from '../lib/realtime';\nimport { syncGoogleEventsToSOMA } from '../lib/calendarSync';`
);
code = code.replace(
  /import \{ syncGoogleEventsToSOMA \} from '\.\.\/lib\/calendarSync';\n  const \{ user \} = useSOMA\(\);\n  const syncGoogleCalendar = async \(\) => \{\n    if \(user\) await syncGoogleEventsToSOMA\(user\.uid\);\n  \};\n\n  import \{ syncGoogleEventsToSOMA \} from '\.\.\/lib\/calendarSync';/,
  `import { syncGoogleEventsToSOMA } from '../lib/calendarSync';`
);

fs.writeFileSync('src/components/GoogleCalendarConnect.tsx', code);
