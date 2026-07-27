import { customAlphabet } from 'nanoid';
import { APPLICATION_REFERENCE_PREFIXES } from '../constants/applicationTypes.js';
import Application from '../models/Application.js';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

export async function generateApplicationReference(type) {
  const prefix = APPLICATION_REFERENCE_PREFIXES[type];
  const year = new Date().getUTCFullYear();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = `IRAP-${prefix}-${year}-${generateCode()}`;
    const exists = await Application.exists({ reference });
    if (!exists) return reference;
  }

  throw new Error('Unable to generate a unique application reference.');
}
