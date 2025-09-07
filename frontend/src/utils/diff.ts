// sdp_vk/frontend/src/utils/diff.ts

const isJsonString = (str: any) => {
  if (typeof str !== 'string' || str.trim() === '') {
    return false;
  }
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const parseIfJson = (value: any) => {
  if (typeof value === 'string' && isJsonString(value)) {
    return JSON.parse(value);
  }
  return value;
};

export const getVersionDiff = (current: Record<string, any>, previous: Record<string, any> | null) => {
  if (!previous) {
    return { changed: current, added: {}, removed: {} };
  }

  const diff: {
    changed: Record<string, { from: any; to: any }>;
    added: Record<string, any>;
    removed: Record<string, any>;
  } = {
    changed: {},
    added: {},
    removed: {},
  };

  const allKeys = new Set([...Object.keys(current), ...Object.keys(previous)]);

  allKeys.forEach(key => {
    const currentValue = parseIfJson(current[key]);
    const previousValue = parseIfJson(previous[key]);

    if (!previous.hasOwnProperty(key)) {
      diff.added[key] = currentValue;
    } else if (!current.hasOwnProperty(key)) {
      diff.removed[key] = previousValue;
    } else if (JSON.stringify(currentValue) !== JSON.stringify(previousValue)) {
      diff.changed[key] = {
        from: previousValue,
        to: currentValue,
      };
    }
  });

  return diff;
};