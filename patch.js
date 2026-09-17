const fs = require('fs');
let code = fs.readFileSync('src/lib/realtime.tsx', 'utf8');
code = code.replace(
  /const unsub = onAuthStateChanged\(auth, \(u\) => \{[\s\S]*?\}\);/,
  `const unsub = initAuth(
      (u, token) => {
        setUser(u);
      },
      () => {
        setUser(null);
        setLoading(false);
        // Clear state on logout
        setSemesters([]);
        setActiveSemester(null);
        setWeeks([]);
        setDays([]);
        setActivities([]);
        setEvidence([]);
        setModules([]);
        setTopics([]);
        setAssessments([]);
      }
    );`
);
fs.writeFileSync('src/lib/realtime.tsx', code);
