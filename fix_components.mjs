import fs from 'fs';

// Fix LibraryHome
let libHome = fs.readFileSync('src/components/library/LibraryHome.tsx', 'utf8');
libHome = libHome.replace(/loadModulesForSemester\(selectedSemester!\.id\);/g, '/* loadModulesForSemester removed */');
fs.writeFileSync('src/components/library/LibraryHome.tsx', libHome);

// Fix TopicsTab
let topicsTab = fs.readFileSync('src/components/library/TopicsTab.tsx', 'utf8');
// It complains about fileName on LibraryTopic
// Wait, I should add fileName and fileData to LibraryTopic in src/types.ts
let typesCode = fs.readFileSync('src/types.ts', 'utf8');
if (!typesCode.includes('export interface LibraryTopic {\\n  id: string;\\n  userId: string;\\n  semesterId: string;\\n  moduleId: string;\\n  name: string;\\n  description: string;\\n  fileName?: string;\\n  fileData?: string;')) {
  typesCode = typesCode.replace(
    /export interface LibraryTopic \{/,
    'export interface LibraryTopic {\n  fileName?: string;\n  fileData?: string;'
  );
  fs.writeFileSync('src/types.ts', typesCode);
}
