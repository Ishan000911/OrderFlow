import crypto from 'node:crypto';
export const randomToken = () => crypto.randomBytes(32).toString('base64url');
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const stableHash = (value) => sha256(JSON.stringify(value, Object.keys(value).sort()));
export const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
