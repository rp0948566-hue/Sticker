export const encodeCursor = (data) => {
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

export const decodeCursor = (cursorStr) => {
  try {
    return JSON.parse(Buffer.from(cursorStr, 'base64').toString('utf-8'));
  } catch (err) {
    return null;
  }
};
