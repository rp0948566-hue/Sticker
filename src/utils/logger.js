export const logEvent = (level, category, message, metadata = {}) => {
  const logMessage = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    category: category.toUpperCase(),
    message,
    metadata
  };
  
  if (level.toLowerCase() === 'error') {
    console.error(JSON.stringify(logMessage));
  } else if (level.toLowerCase() === 'warn') {
    console.warn(JSON.stringify(logMessage));
  } else {
    console.log(JSON.stringify(logMessage));
  }
};
