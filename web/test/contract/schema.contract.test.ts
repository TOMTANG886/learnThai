// web/test/contract/schema.contract.test.ts
// Contract tests for the schema-validator module.

import { validateSchema, POST_REQUIRED_COLUMNS } from '../../scripts/schema-validator';

describe('validateSchema — contract tests', () => {
  test('passes when all required columns are present (exact match)', () => {
    const headers = ['title', 'slug', 'body_markdown', 'publish_flag'];
    expect(() => validateSchema(headers)).not.toThrow();
  });

  test('passes when extra/unknown columns are present (not strict)', () => {
    const headers = [
      'title', 'slug', 'body_markdown', 'publish_flag',
      'date', 'author', 'tags', 'audio_url', 'extra_col',
    ];
    expect(() => validateSchema(headers)).not.toThrow();
  });

  test('passes with case-insensitive headers — TITLE matches title', () => {
    const headers = ['TITLE', 'SLUG', 'BODY_MARKDOWN', 'PUBLISH_FLAG'];
    expect(() => validateSchema(headers)).not.toThrow();
  });

  test('passes with mixed-case headers', () => {
    const headers = ['Title', 'Slug', 'Body_Markdown', 'Publish_Flag'];
    expect(() => validateSchema(headers)).not.toThrow();
  });

  test('throws SCHEMA_VALIDATION_FAILED when title is missing', () => {
    const headers = ['slug', 'body_markdown', 'publish_flag'];
    let err: (Error & { code?: string }) | undefined;
    try {
      validateSchema(headers);
    } catch (e) {
      err = e as Error & { code?: string };
    }
    expect(err).toBeDefined();
    expect(err?.code).toBe('SCHEMA_VALIDATION_FAILED');
    expect(err?.message).toMatch(/title/i);
  });

  test('throws SCHEMA_VALIDATION_FAILED when slug is missing', () => {
    const headers = ['title', 'body_markdown', 'publish_flag'];
    let err: (Error & { code?: string }) | undefined;
    try {
      validateSchema(headers);
    } catch (e) {
      err = e as Error & { code?: string };
    }
    expect(err).toBeDefined();
    expect(err?.code).toBe('SCHEMA_VALIDATION_FAILED');
    expect(err?.message).toMatch(/slug/i);
  });

  test('throws SCHEMA_VALIDATION_FAILED when body_markdown is missing', () => {
    const headers = ['title', 'slug', 'publish_flag'];
    let err: (Error & { code?: string }) | undefined;
    try {
      validateSchema(headers);
    } catch (e) {
      err = e as Error & { code?: string };
    }
    expect(err).toBeDefined();
    expect(err?.code).toBe('SCHEMA_VALIDATION_FAILED');
    expect(err?.message).toMatch(/body_markdown/i);
  });

  test('throws SCHEMA_VALIDATION_FAILED when publish_flag is missing', () => {
    const headers = ['title', 'slug', 'body_markdown'];
    let err: (Error & { code?: string }) | undefined;
    try {
      validateSchema(headers);
    } catch (e) {
      err = e as Error & { code?: string };
    }
    expect(err).toBeDefined();
    expect(err?.code).toBe('SCHEMA_VALIDATION_FAILED');
    expect(err?.message).toMatch(/publish_flag/i);
  });

  test('throws listing ALL missing columns when multiple are absent', () => {
    const headers = ['date', 'author'];
    let err: (Error & { code?: string }) | undefined;
    try {
      validateSchema(headers);
    } catch (e) {
      err = e as Error & { code?: string };
    }
    expect(err).toBeDefined();
    expect(err?.code).toBe('SCHEMA_VALIDATION_FAILED');
    expect(err?.message).toMatch(/title/i);
    expect(err?.message).toMatch(/slug/i);
    expect(err?.message).toMatch(/body_markdown/i);
    expect(err?.message).toMatch(/publish_flag/i);
  });

  test('POST_REQUIRED_COLUMNS includes the four expected columns', () => {
    expect(POST_REQUIRED_COLUMNS).toContain('title');
    expect(POST_REQUIRED_COLUMNS).toContain('slug');
    expect(POST_REQUIRED_COLUMNS).toContain('body_markdown');
    expect(POST_REQUIRED_COLUMNS).toContain('publish_flag');
  });
});
