import fs from 'fs';
let code = fs.readFileSync('src/lib/realtime.tsx', 'utf8');

if (!code.includes("collection(db, 'external_calendar_events')")) {
  code = code.replace(
    /const qAsm = query\(collection\(db, 'assessments'\)\);[\s\S]*?\}\)\);/g,
    `$&
    
    // External Calendar Events
    const qExt = query(collection(db, 'external_calendar_events'));
    unsubs.push(onSnapshot(qExt, (snap) => {
      setExternalEvents(snap.docs.map(d => ({ ...d.data(), id: d.id } as ExternalCalendarEvent)));
    }));`
  );
  
  // also add clear on signout
  code = code.replace(
    /setAssessments\(\[\]\);/g,
    'setAssessments([]);\n        setExternalEvents([]);'
  );

  fs.writeFileSync('src/lib/realtime.tsx', code);
}
