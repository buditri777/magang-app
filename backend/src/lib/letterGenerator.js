/**
 * Letter generator: replace ${placeholder} in .docx template
 * Templates use ${var} syntax (not standard {var} docxtemplater).
 * For multi template: row with ${student_no} is duplicated per student.
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const TEMPLATE_DIR = path.join(__dirname, '..', '..', 'templates');

/**
 * Format Indonesian date: "21 Mei 2026"
 */
function formatDateID(date) {
  const d = new Date(date);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format internship period: "1 Juli 2026 sampai dengan 30 September 2026 (3 bulan)"
 */
function formatPeriod(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const months = Math.round((e - s) / (1000 * 60 * 60 * 24 * 30));
  return `${formatDateID(s)} sampai dengan ${formatDateID(e)} (${months} bulan)`;
}

/**
 * Replace simple ${key} placeholders in document XML.
 * Word splits text into multiple <w:t> runs, so we sanitize first.
 */
function sanitizeXml(xml) {
  // Merge adjacent <w:t> tags so ${var} that got split is recombined
  // Pattern: </w:t></w:r><w:r ...><w:t...>  →  remove if between $ { } chars
  // Simpler: just remove all <w:t...> & </w:t> that are between $ and }
  return xml.replace(/\$(?:<[^>]+>)*\{(?:<[^>]+>|[^}])*?\}/g, (match) => {
    // Strip XML tags inside the match, keep only text
    const text = match.replace(/<[^>]+>/g, '');
    return text;
  });
}

function replaceVars(xml, vars) {
  let out = sanitizeXml(xml);
  for (const [key, val] of Object.entries(vars)) {
    const safe = String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    out = out.split(`\${${key}}`).join(safe);
  }
  // Remove any unfilled placeholders
  out = out.replace(/\$\{[a-z_]+\}/gi, '');
  return out;
}

/**
 * Generate single-student letter (single.docx template).
 */
function generateSingleLetter({
  letterCity = 'Surakarta',
  letterDate = new Date(),
  letterNumber,
  recipientTitle,
  companyAddress,
  studentName,
  studentNumber,
  studentProgram,
  internshipRole,
  internshipPeriod,
  signatoryPosition,
  signatoryName,
}) {
  const templatePath = path.join(TEMPLATE_DIR, 'single.docx');
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  const vars = {
    letter_city: letterCity,
    letter_date: formatDateID(letterDate),
    letter_number: letterNumber || '___/UDB/.../...',
    recipient_title: recipientTitle || 'Pimpinan',
    company_address: companyAddress,
    student_name: studentName,
    student_number: studentNumber,
    student_program: studentProgram,
    internship_role: internshipRole,
    internship_period: internshipPeriod,
    signatory_position: signatoryPosition || 'Dekan',
    signatory_name: signatoryName || 'Triyono, S.Kom., M.Kom.',
  };

  const documentXml = zip.file('word/document.xml').asText();
  const replaced = replaceVars(documentXml, vars);
  zip.file('word/document.xml', replaced);

  return zip.generate({ type: 'nodebuffer' });
}

/**
 * Generate multi-student letter (multi.docx template).
 * Students = [{name, number, program}, ...]
 */
function generateMultiLetter({
  letterCity = 'Surakarta',
  letterDate = new Date(),
  letterNumber,
  recipientTitle,
  companyAddress,
  students,
  internshipRole,
  internshipPeriod,
  signatoryPosition,
  signatoryName,
}) {
  const templatePath = path.join(TEMPLATE_DIR, 'multi.docx');
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  let documentXml = zip.file('word/document.xml').asText();
  documentXml = sanitizeXml(documentXml);

  // Find the student row template and duplicate per student
  // The template has 1 data row with ${student_no} ${student_name} ${student_number} ${student_program}
  // We need to find that <w:tr> and clone it.
  const trRegex = /<w:tr\b[^>]*>(?:(?!<\/w:tr>)[\s\S])*?\$\{student_no\}[\s\S]*?<\/w:tr>/;
  const match = documentXml.match(trRegex);

  if (match) {
    const rowTemplate = match[0];
    const rows = students.map((s, i) => {
      let row = rowTemplate;
      row = row.split('${student_no}').join(String(i + 1));
      row = row.split('${student_name}').join(escapeXml(s.name || ''));
      row = row.split('${student_number}').join(escapeXml(s.number || ''));
      row = row.split('${student_program}').join(escapeXml(s.program || ''));
      return row;
    }).join('');
    documentXml = documentXml.replace(rowTemplate, rows);
  }

  // Replace remaining vars
  const vars = {
    letter_city: letterCity,
    letter_date: formatDateID(letterDate),
    letter_number: letterNumber || '___/UDB/.../...',
    recipient_title: recipientTitle || 'Pimpinan',
    company_address: companyAddress,
    internship_role: internshipRole,
    internship_period: internshipPeriod,
    signatory_position: signatoryPosition || 'Dekan',
    signatory_name: signatoryName || 'Triyono, S.Kom., M.Kom.',
  };

  for (const [key, val] of Object.entries(vars)) {
    documentXml = documentXml.split(`\${${key}}`).join(escapeXml(String(val ?? '')));
  }
  documentXml = documentXml.replace(/\$\{[a-z_]+\}/gi, '');

  zip.file('word/document.xml', documentXml);
  return zip.generate({ type: 'nodebuffer' });
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  generateSingleLetter,
  generateMultiLetter,
  formatDateID,
  formatPeriod,
};
