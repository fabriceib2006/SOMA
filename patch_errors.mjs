import fs from 'fs';

let typesCode = fs.readFileSync('src/types.ts', 'utf8');
typesCode = typesCode.replace(/  fileName\?: string;\n  fileData\?: string;/g, '');
typesCode = typesCode.replace(/export interface LibraryTopic \{/, 'export interface LibraryTopic {\n  fileName?: string;\n  fileData?: string;');
typesCode = typesCode.replace(/export interface AcademicAssessment \{/, 'export interface AcademicAssessment {\n  fileName?: string;\n  fileData?: string;');
fs.writeFileSync('src/types.ts', typesCode);

