// CSV export helpers. Cells that spreadsheet apps would evaluate as formulas are neutralised.

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T extends Record<string, unknown>>(columns: { key: keyof T & string; label: string }[], rows: T[]): string {
  const header = columns.map((column) => csvCell(column.label)).join(",");
  const lines = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(","));
  return [header, ...lines].join("\r\n");
}
