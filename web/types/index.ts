export interface WorksheetRow {
  [key: string]: string | undefined;
  _slug?: string;
}

export interface WorksheetData {
  worksheetName: string;
  worksheetSlug: string;
  columns: string[];
  rows: WorksheetRow[];
}

export interface WorksheetMeta {
  worksheetName: string;
  worksheetSlug: string;
  rowCount: number;
  audioHash?: string;
}

export interface GeneratedFile {
  path: string;
  hash: string;
}

export interface BuildManifest {
  run_id: string;
  timestamp: string;
  source: string;
  worksheets: WorksheetMeta[];
  generated_files: GeneratedFile[];
  errors: string[];
}

export interface SheetData {
  worksheetName: string;
  headers: string[];
  rows: Record<string, string>[];
}
