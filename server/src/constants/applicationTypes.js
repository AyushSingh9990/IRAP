export const APPLICATION_TYPES = Object.freeze({
  MEMBER: 'member',
  TRAINING_PROVIDER: 'training_provider',
  ORGANIZATION: 'organization',
});

export const APPLICATION_TYPE_VALUES = Object.freeze(
  Object.values(APPLICATION_TYPES),
);

export const APPLICATION_TYPE_LABELS = Object.freeze({
  [APPLICATION_TYPES.MEMBER]: 'Professional Member',
  [APPLICATION_TYPES.TRAINING_PROVIDER]: 'Training Provider',
  [APPLICATION_TYPES.ORGANIZATION]: 'Accredited Organization',
});

export const APPLICATION_REFERENCE_PREFIXES = Object.freeze({
  [APPLICATION_TYPES.MEMBER]: 'MEM',
  [APPLICATION_TYPES.TRAINING_PROVIDER]: 'TPR',
  [APPLICATION_TYPES.ORGANIZATION]: 'ORG',
});
