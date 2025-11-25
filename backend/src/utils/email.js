import nodemailer from 'nodemailer'
import { security } from '../config/index.js'

let transporter = null

const ensureTransporter = () => {
  if (transporter) return transporter
  const { smtpHost, smtpPort, smtpUser, smtpPass } = security.email
  if (!smtpHost || !smtpUser || !smtpPass) {
    return null
  }
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })
  return transporter
}

export const sendEmail = async ({ to, subject, text, html }) => {
  const tx = ensureTransporter()
  if (!tx) {
    // In dev or missing SMTP config, skip sending.
    return { accepted: [], rejected: ['No SMTP configured'] }
  }
  return tx.sendMail({
    from: security.email.from,
    to,
    subject,
    text,
    html,
  })
}

export default sendEmail
