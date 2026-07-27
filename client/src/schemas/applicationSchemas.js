import { z } from 'zod';

function schemaForField(field) {
  if (field.type === 'checkbox') {
    const booleanSchema = z.boolean();
    return field.required
      ? booleanSchema.refine((value) => value === true, {
          message: 'You must confirm this declaration.',
        })
      : booleanSchema;
  }

  if (field.inputType === 'number') {
    let numberSchema = z.coerce.number();
    if (field.min !== undefined) numberSchema = numberSchema.min(field.min);
    if (field.max !== undefined) numberSchema = numberSchema.max(field.max);
    return z.preprocess((value) => (value === '' ? undefined : value), numberSchema);
  }

  let stringSchema = z.string().trim();
  if (field.required) stringSchema = stringSchema.min(1, `${field.label} is required.`);
  if (field.minLength) stringSchema = stringSchema.min(field.minLength, `${field.label} must contain at least ${field.minLength} characters.`);
  if (field.maxLength) stringSchema = stringSchema.max(field.maxLength, `${field.label} must contain ${field.maxLength} characters or fewer.`);
  if (field.inputType === 'email') {
    stringSchema = field.required
      ? stringSchema.email('Enter a valid email address.')
      : stringSchema.refine((value) => value === '' || z.string().email().safeParse(value).success, { message: 'Enter a valid email address.' });
  }
  if (field.inputType === 'url') {
    stringSchema = stringSchema.refine(
      (value) => value === '' || z.string().url().safeParse(value).success,
      { message: 'Enter a complete URL, including https://.' },
    );
  }
  return stringSchema;
}

export function createApplicationStepSchema(step) {
  return z.object(
    Object.fromEntries(step.fields.map((field) => [field.name, schemaForField(field)])),
  );
}
