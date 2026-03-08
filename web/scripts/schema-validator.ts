export const POST_REQUIRED_COLUMNS = ['title', 'slug', 'body_markdown', 'publish_flag'];

interface SchemaValidationError extends Error {
  code: string;
}

export function validateSchema(
  headers: string[],
  required: string[] = POST_REQUIRED_COLUMNS,
  worksheetName: string = 'worksheet'
): void {
  const normalised = headers.map((h) => h.toLowerCase().trim());
  const missing = required.filter((col) => !normalised.includes(col.toLowerCase()));

  if (missing.length > 0) {
    const err = new Error(
      `[schema-validator] Schema validation failed for "${worksheetName}".\n` +
        `  Missing required columns: ${missing.join(', ')}\n` +
        `  Found columns: ${headers.join(', ')}`
    ) as SchemaValidationError;
    err.code = 'SCHEMA_VALIDATION_FAILED';
    throw err;
  }
}

export function validateSchemaOrExit(
  headers: string[],
  required: string[] = POST_REQUIRED_COLUMNS,
  worksheetName: string = 'worksheet'
): void {
  try {
    validateSchema(headers, required, worksheetName);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
