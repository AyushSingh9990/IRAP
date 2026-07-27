import SequenceCounter from '../models/SequenceCounter.js';

function normalizePrefix(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export async function generateSequentialRegistryNumber({
  category,
  prefix,
  year = new Date().getUTCFullYear(),
}) {
  const safePrefix = normalizePrefix(prefix);
  if (!safePrefix) throw new Error('A valid registry prefix is required.');

  const counter = await SequenceCounter.findOneAndUpdate(
    { key: `${category}:${safePrefix}:${year}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `${category}:${safePrefix}:${year}` } },
    { new: true, upsert: true, runValidators: true },
  );

  return `IRAP-${safePrefix}-${year}-${String(counter.value).padStart(6, '0')}`;
}
