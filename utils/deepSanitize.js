const sanitizeHtml = require('sanitize-html');

// Recursive function to sanitize all string values in an object
function deepSanitize(value) {
  if (typeof value === 'string') {
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {}
    });
  }
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = deepSanitize(value[key]);
      return acc;
    }, {});
  }
  return value;
}

module.exports = deepSanitize;
