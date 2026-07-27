export const APPLICATION_PURPOSES = Object.freeze({
  INITIAL: 'initial',
  RENEWAL: 'renewal',
});

export const APPLICATION_PURPOSE_VALUES = Object.freeze(
  Object.values(APPLICATION_PURPOSES),
);

export const APPLICATION_PURPOSE_LABELS = Object.freeze({
  [APPLICATION_PURPOSES.INITIAL]: 'Initial application',
  [APPLICATION_PURPOSES.RENEWAL]: 'Renewal application',
});
