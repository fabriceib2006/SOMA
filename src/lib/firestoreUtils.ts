export function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      // If property is fileData or fileDataUrl and extremely large (base64 > 500KB), omit it to prevent Firestore 1MB document limit error
      if ((key === 'fileData' || key === 'fileDataUrl') && typeof val === 'string' && val.length > 500000) {
        console.warn(`Omitted large ${key} of length ${val.length} to prevent Firestore 1MB limit error.`);
        continue;
      }
      cleaned[key] = cleanUndefined(val);
    }
  }
  return cleaned;
}

