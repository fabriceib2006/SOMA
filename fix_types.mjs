import fs from 'fs';
let code = fs.readFileSync('src/types.ts', 'utf8');

// The file had duplicate fileName fields. Remove them from Omit<LibraryTopic, 'id'> and others if they are there, or just fix the types file.
// Wait, the error is:
// src/types.ts(32,3): error TS2300: Duplicate identifier 'fileName'.
// src/types.ts(36,3): error TS2300: Duplicate identifier 'fileName'.

code = code.replace(/  fileName\?: string;\n  fileData\?: string;\n  fileName\?: string;\n  fileData\?: string;/g, '  fileName?: string;\n  fileData?: string;');
fs.writeFileSync('src/types.ts', code);
