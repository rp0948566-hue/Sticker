import fs from 'fs';

const logEmail = (to, subject, content) => {
  const logMessage = `[${new Date().toISOString()}] TO: ${to} | SUBJECT: ${subject}\nCONTENT:\n${content}\n------------------------------------------\n`;
  console.log(`[EMAIL SEND SIMULATION] TO: ${to} | SUBJECT: ${subject}`);
  try {
    fs.appendFileSync('emails_sent.log', logMessage);
  } catch (error) {
    console.error('Failed to log email:', error.message);
  }
};

export const sendAdminEmail = (subject, content) => {
  logEmail('admin@stickitup.com', subject, content);
};

export const sendCustomerEmail = (email, subject, content) => {
  logEmail(email, subject, content);
};
