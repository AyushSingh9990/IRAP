import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { TEMPLATE_STATUSES } from '../constants/siteAdministration.js';
import EmailTemplate from '../models/EmailTemplate.js';

let transporter;

function renderTemplateValue(value, variables, { html = false } = {}) {
  return String(value || '').replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_match, key) => {
    if (!Object.prototype.hasOwnProperty.call(variables, key)) return '';
    const replacement = String(variables[key] ?? '');
    return html ? escapeHtml(replacement) : replacement;
  });
}

async function resolveEmailTemplate(key, fallback, variables = {}) {
  if (mongoose.connection.readyState !== 1) return fallback;
  try {
    const template = await EmailTemplate.findOne({ key, status: TEMPLATE_STATUSES.ACTIVE }).lean();
    if (!template) return fallback;
    return {
      subject: renderTemplateValue(template.subject, variables),
      text: renderTemplateValue(template.textBody, variables),
      html: template.htmlBody
        ? renderTemplateValue(template.htmlBody, variables, { html: true })
        : fallback.html,
    };
  } catch (error) {
    logger.warn({ error, templateKey: key }, 'Email template lookup failed; using built-in fallback');
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getTransporter() {
  if (transporter) return transporter;

  if (!environment.mail.smtpConfigured) return null;

  transporter = nodemailer.createTransport({
    host: environment.mail.host,
    port: environment.mail.port,
    secure: environment.mail.secure,
    auth: {
      user: environment.mail.user,
      pass: environment.mail.password,
    },
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return transporter;
}

async function deliver({ to, subject, text, html, developmentUrl }) {
  const mailer = getTransporter();

  if (!mailer) {
    if (environment.isProduction) {
      throw new Error('SMTP is required in production.');
    }

    logger.info(
      { to, subject },
      'Email delivery is in development-log mode; the preview URL is returned only in the local API response',
    );
    return { delivered: false, developmentUrl };
  }

  try {
    await mailer.sendMail({
      from: `${environment.mail.fromName} <${environment.mail.fromAddress}>`,
      to,
      subject,
      text,
      html,
    });
    return { delivered: true };
  } catch (error) {
    logger.error({ error, to, subject }, 'Email delivery failed');
    return { delivered: false };
  }
}

export async function sendVerificationEmail({ user, token }) {
  const url = `${environment.clientUrls[0]}/verify-email/${encodeURIComponent(token)}`;
  const fallback = {
    subject: 'Verify your iRAP email address',
    text: `Verify your iRAP email address: ${url}`,
    html: `<p>Hello ${escapeHtml(user.firstName)},</p><p>Verify your iRAP email address using the link below.</p><p><a href="${url}">Verify email address</a></p>`,
  };
  const template = await resolveEmailTemplate('auth.email_verification', fallback, {
    firstName: user.firstName,
    displayName: user.displayName || user.firstName,
    email: user.email,
    url,
  });
  return deliver({ to: user.email, ...template, developmentUrl: url });
}

export async function sendPasswordResetEmail({ user, token }) {
  const url = `${environment.clientUrls[0]}/reset-password/${encodeURIComponent(token)}`;
  const fallback = {
    subject: 'Reset your iRAP password',
    text: `Reset your iRAP password: ${url}`,
    html: `<p>Hello ${escapeHtml(user.firstName)},</p><p>Use the link below to reset your password.</p><p><a href="${url}">Reset password</a></p>`,
  };
  const template = await resolveEmailTemplate('auth.password_reset', fallback, {
    firstName: user.firstName,
    displayName: user.displayName || user.firstName,
    email: user.email,
    url,
  });
  return deliver({ to: user.email, ...template, developmentUrl: url });
}

export async function sendEmailChangeVerification({ user, newEmail, token }) {
  const url = `${environment.clientUrls[0]}/verify-email-change/${encodeURIComponent(token)}`;
  const fallback = {
    subject: 'Confirm your new iRAP email address',
    text: `Confirm your new iRAP email address: ${url}`,
    html: `<p>Hello ${escapeHtml(user.firstName)},</p><p>Confirm this email address for your iRAP account.</p><p><a href="${url}">Confirm new email address</a></p>`,
  };
  const template = await resolveEmailTemplate('auth.email_change_verification', fallback, {
    firstName: user.firstName,
    displayName: user.displayName || user.firstName,
    email: newEmail,
    url,
  });
  return deliver({ to: newEmail, ...template, developmentUrl: url });
}

export async function sendEmailChangedNotice({ user, previousEmail }) {
  const fallback = {
    subject: 'Your iRAP email address was changed',
    text: 'The email address for your iRAP account was changed. Contact support immediately if you did not make this change.',
    html: `<p>Hello ${escapeHtml(user.firstName)},</p><p>The email address for your iRAP account was changed.</p><p>Contact support immediately if you did not make this change.</p>`,
  };
  const template = await resolveEmailTemplate('auth.email_changed_notice', fallback, {
    firstName: user.firstName,
    displayName: user.displayName || user.firstName,
    previousEmail,
    email: user.email,
  });
  return deliver({ to: previousEmail, ...template });
}

export async function sendTwoFactorCode({ user, code }) {
  const fallback = {
    subject: 'Your iRAP login verification code',
    text: `Your iRAP login verification code is ${code}.`,
    html: `<p>Hello ${escapeHtml(user.firstName)},</p><p>Your iRAP login verification code is <strong>${escapeHtml(code)}</strong>.</p><p>This code expires shortly and can be used only once.</p>`,
  };
  const template = await resolveEmailTemplate('auth.two_factor_code', fallback, {
    firstName: user.firstName,
    displayName: user.displayName || user.firstName,
    email: user.email,
    code,
  });
  return deliver({ to: user.email, ...template });
}

export async function sendApplicationReviewEmailSafely({
  user,
  subject,
  heading,
  message,
  applicationReference,
}) {
  try {
    const safeHeading = escapeHtml(heading);
    const safeMessage = escapeHtml(message);
    const safeReference = escapeHtml(applicationReference);
    const fallback = {
      subject,
      text: `${heading}\n\nApplication: ${applicationReference}\n\n${message}`,
      html: `<p>Hello ${escapeHtml(user.firstName || user.displayName || 'Applicant')},</p><h2>${safeHeading}</h2><p><strong>Application:</strong> ${safeReference}</p><p>${safeMessage}</p>`,
    };
    const template = await resolveEmailTemplate('application.review_update', fallback, {
      firstName: user.firstName || '',
      displayName: user.displayName || user.firstName || 'Applicant',
      email: user.email,
      heading,
      message,
      applicationReference,
    });
    return await deliver({ to: user.email, ...template });
  } catch (error) {
    logger.error(
      { error, userId: user.id, applicationReference },
      'Application review email delivery failed',
    );
    return { delivered: false };
  }
}
