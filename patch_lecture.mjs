import fs from 'fs';
let typesCode = fs.readFileSync('src/types.ts', 'utf8');
typesCode = typesCode.replace(/export interface LectureMaterial \{/, 'export interface LectureMaterial {\n  fileData?: string;');
fs.writeFileSync('src/types.ts', typesCode);
