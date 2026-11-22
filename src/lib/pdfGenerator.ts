/**
 * Generates a valid, standards-compliant PDF 1.4 binary Buffer containing
 * structured academic study notes (title, metadata, wrapped content lines, footer).
 */

function escapePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(line: string, maxChars = 84): string[] {
  if (line.trim().length === 0) return [''];
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface PdfNoteInput {
  title: string;
  subjectName?: string;
  courseTitle?: string;
  chapterTitle?: string;
  category: string;
  description: string;
  contentBody: string;
  platformName?: string;
}

export function buildStudyNotePdf(note: PdfNoteInput): Buffer {
  const brand = note.platformName || 'ASPD';
  const rawLines: { text: string; font: 'F2' | 'F1'; size: number; lead: number }[] = [];

  rawLines.push({ text: `${brand} ACADEMIC STUDY MATERIAL`, font: 'F2', size: 10, lead: 16 });
  for (const l of wrapLine(note.title, 54)) {
    rawLines.push({ text: l, font: 'F2', size: 17, lead: 22 });
  }
  const metaParts = [
    note.courseTitle,
    note.subjectName,
    note.chapterTitle,
    note.category,
  ].filter(Boolean);
  if (metaParts.length > 0) {
    for (const l of wrapLine(metaParts.join('  |  '), 88)) {
      rawLines.push({ text: l, font: 'F1', size: 9.5, lead: 14 });
    }
  }
  rawLines.push({
    text: '____________________________________________________________________________________',
    font: 'F1',
    size: 10,
    lead: 18,
  });

  if (note.description) {
    for (const l of wrapLine(note.description, 84)) {
      rawLines.push({ text: l, font: 'F1', size: 10.5, lead: 15 });
    }
    rawLines.push({ text: '', font: 'F1', size: 10, lead: 10 });
  }

  const bodyLines = (note.contentBody || 'No additional text content attached.').split(/\r?\n/);
  for (const bLine of bodyLines) {
    const isHeading = /^\d+\.\s+/.test(bLine.trim());
    const wrapped = wrapLine(bLine, isHeading ? 72 : 84);
    for (const wl of wrapped) {
      rawLines.push({
        text: wl,
        font: isHeading ? 'F2' : 'F1',
        size: isHeading ? 12 : 10.5,
        lead: isHeading ? 19 : 15,
      });
    }
  }

  // Paginate lines across US Letter pages (612 x 792 pt)
  const pages: typeof rawLines[] = [];
  let currentPage: typeof rawLines = [];
  let y = 740;
  const bottomMargin = 64;

  for (const item of rawLines) {
    if (y - item.lead < bottomMargin && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      y = 740;
    }
    currentPage.push(item);
    y -= item.lead;
  }
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }
  if (pages.length === 0) {
    pages.push([{ text: note.title, font: 'F2', size: 16, lead: 22 }]);
  }

  const objects: string[] = [];
  // 1: Catalog, 2: Pages, 3: Helvetica Regular, 4: Helvetica Bold
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  const pageObjNums: number[] = [];
  const firstPageObjNum = 5;
  for (let i = 0; i < pages.length; i++) {
    pageObjNums.push(firstPageObjNum + i * 2);
  }

  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`
  );
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  );
  objects.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n'
  );

  for (let p = 0; p < pages.length; p++) {
    const pageObjNum = firstPageObjNum + p * 2;
    const contentObjNum = pageObjNum + 1;

    const cmds: string[] = [];
    // Subtle header accent bar
    cmds.push('0.11 0.31 0.85 rg');
    cmds.push('48 764 516 3 re f');
    cmds.push('0.06 0.09 0.16 rg');

    let cursorY = 740;
    for (const item of pages[p]) {
      if (item.text.length > 0) {
        cmds.push('BT');
        cmds.push(`/${item.font} ${item.size} Tf`);
        cmds.push(`48 ${cursorY} Td`);
        cmds.push(`(${escapePdfText(item.text)}) Tj`);
        cmds.push('ET');
      }
      cursorY -= item.lead;
    }

    // Footer
    cmds.push('0.45 0.50 0.58 rg');
    cmds.push('BT');
    cmds.push('/F1 8.5 Tf');
    cmds.push('48 34 Td');
    cmds.push(
      `(${escapePdfText(`${brand} Educational Platform  |  Page ${p + 1} of ${pages.length}`)}) Tj`
    );
    cmds.push('ET');

    const stream = cmds.join('\n') + '\n';
    const streamLen = Buffer.byteLength(stream, 'utf8');

    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`
    );
    objects.push(
      `${contentObjNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}endstream\nendobj\n`
    );
  }

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
