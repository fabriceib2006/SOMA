import fs from 'fs';
let code = fs.readFileSync('src/lib/realtime.tsx', 'utf8');

if (!code.includes('externalEvents: ExternalCalendarEvent[];')) {
  // Add to SOMAContextType
  code = code.replace(
    /interface SOMAContextType \{[\s\S]*?syncStatus:/,
    (match) => match.replace(
      '// Synchronization State',
      'externalEvents: ExternalCalendarEvent[];\n  // Synchronization State'
    )
  );

  // Add to value
  code = code.replace(
    /const value: SOMAContextType = \{([\s\S]*?)syncStatus,/,
    'const value: SOMAContextType = {$1externalEvents,\n    syncStatus,'
  );
  
  fs.writeFileSync('src/lib/realtime.tsx', code);
}
