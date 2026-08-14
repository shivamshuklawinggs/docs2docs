// Unique id generator using timestamp + random to avoid duplicates on server restart
function uid(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}-${timestamp}-${random}`;
}

function now(): string {
  return new Date().toISOString();
}

export { uid, now };
