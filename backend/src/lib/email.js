/**
 * Email service - send welcome, password reset, notifications
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[email] SMTP not configured, skipping send to', to);
    return { skipped: true };
  }
  try {
    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || `"Magang UDB" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('[email] sent', info.messageId, 'to', to);
    return { messageId: info.messageId };
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { error: err.message };
  }
}

function welcomeEmail({ name, email, tempPassword, frontendUrl }) {
  const url = frontendUrl || process.env.FRONTEND_URL || 'https://magang-udb.vercel.app';
  return {
    subject: '[Magang UDB] Akun Anda telah dibuat',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1565c0;">Selamat datang di Sistem Magang UDB</h2>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Akun Anda telah dibuat oleh administrator. Berikut detail akses Anda:</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 6px 12px;"><strong>Email</strong></td><td style="padding: 6px 12px;">${email}</td></tr>
          <tr><td style="padding: 6px 12px;"><strong>Password sementara</strong></td><td style="padding: 6px 12px; font-family: monospace; background: #f5f5f5; padding: 4px 8px;">${tempPassword}</td></tr>
        </table>
        <p>Silakan login dan ubah password Anda di:</p>
        <p><a href="${url}" style="background: #1565c0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Login ke Magang UDB</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 32px;">
          Email ini dikirim otomatis. Mohon jangan dibalas.<br>
          Universitas Duta Bangsa Surakarta
        </p>
      </div>
    `,
    text: `Selamat datang di Sistem Magang UDB\n\nHalo ${name},\n\nEmail: ${email}\nPassword sementara: ${tempPassword}\n\nLogin di: ${url}\n\nMohon ganti password setelah login pertama.`,
  };
}

function resetPasswordEmail({ name, email, tempPassword, frontendUrl }) {
  const url = frontendUrl || process.env.FRONTEND_URL || 'https://magang-udb.vercel.app';
  return {
    subject: '[Magang UDB] Password Anda telah direset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ed6c02;">Password Anda telah direset</h2>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Administrator telah mereset password akun Anda. Password sementara baru:</p>
        <p style="font-family: monospace; background: #fff3e0; padding: 12px 16px; font-size: 18px; border-left: 4px solid #ed6c02;">
          ${tempPassword}
        </p>
        <p>Silakan login dan segera ubah password:</p>
        <p><a href="${url}" style="background: #1565c0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Login ke Magang UDB</a></p>
      </div>
    `,
    text: `Password Anda telah direset.\n\nPassword sementara: ${tempPassword}\nLogin: ${url}`,
  };
}

function applicationStatusEmail({ name, status, companyName, reason, frontendUrl }) {
  const url = frontendUrl || process.env.FRONTEND_URL || 'https://magang-udb.vercel.app';
  const statusMap = {
    submitted: { color: '#0288d1', label: 'sedang direview', message: 'Pengajuan magang Anda telah diterima dan sedang ditinjau oleh Admin UPI.' },
    approved: { color: '#2e7d32', label: 'disetujui', message: 'Pengajuan magang Anda telah disetujui. Surat pengantar akan segera diterbitkan.' },
    rejected: { color: '#d32f2f', label: 'ditolak', message: `Pengajuan magang Anda ditolak.${reason ? '<br><br><strong>Alasan:</strong> ' + reason : ''}` },
    letter_generated: { color: '#1565c0', label: 'surat sudah terbit', message: 'Surat pengantar magang sudah dapat diunduh dari sistem.' },
    signed: { color: '#7b1fa2', label: 'surat ditandatangani', message: 'Surat pengantar Anda sudah ditandatangani dan siap diserahkan ke perusahaan.' },
  };
  const s = statusMap[status] || { color: '#666', label: status, message: '' };

  return {
    subject: `[Magang UDB] Pengajuan magang ${s.label}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${s.color};">Pengajuan magang ${s.label}</h2>
        <p>Halo <strong>${name}</strong>,</p>
        <p>Status pengajuan magang Anda di <strong>${companyName}</strong>:</p>
        <p>${s.message}</p>
        <p><a href="${url}" style="background: ${s.color}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Buka Magang UDB</a></p>
      </div>
    `,
    text: `Status pengajuan ${companyName}: ${s.label}\n${s.message.replace(/<[^>]+>/g, '')}\n\n${url}`,
  };
}

module.exports = {
  sendMail,
  welcomeEmail,
  resetPasswordEmail,
  applicationStatusEmail,
};
