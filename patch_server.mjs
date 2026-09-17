import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /const \{ modules, topics, assessments, existingTimetable, date, studyHistory, studentRisk, masteryScores \} = req\.body;/,
  `const { modules, topics, assessments, existingTimetable, date, studyHistory, studentRisk, masteryScores, externalCalendarEvents } = req.body;`
);

code = code.replace(
  /- Existing Timetable Today: \$\{JSON\.stringify\(existingTimetable\)\}/,
  `- Existing Timetable Today: \${JSON.stringify(existingTimetable)}\n        - Google Calendar External Commitments (ABSOLUTE BLOCKERS): \${JSON.stringify(externalCalendarEvents)}`
);

code = code.replace(
  /3\. Do NOT schedule study sessions during fixed classes\/events in \$\{JSON\.stringify\(existingTimetable\)\}\./,
  `3. Do NOT schedule study sessions during fixed classes in \${JSON.stringify(existingTimetable)} OR during any Google Calendar external commitments: \${JSON.stringify(externalCalendarEvents)}.`
);

fs.writeFileSync('server.ts', code);
