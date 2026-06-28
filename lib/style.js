// Parse a CSS declaration string ("padding:10px; color:red") into a React style object.
// Handles custom properties (--brand) and camel-cases normal properties.
export function css(str) {
  const out = {};
  if (!str) return out;
  for (const rule of str.split(';')) {
    const i = rule.indexOf(':');
    if (i < 0) continue;
    const prop = rule.slice(0, i).trim();
    const val = rule.slice(i + 1).trim();
    if (!prop || !val) continue;
    if (prop.startsWith('--')) {
      out[prop] = val;
    } else {
      const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[camel] = val;
    }
  }
  return out;
}
