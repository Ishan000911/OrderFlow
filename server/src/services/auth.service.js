import argon2 from 'argon2';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/http.js';
import { randomToken, sha256 } from '../utils/security.js';

const publicUser = ({ id, name, email, role, createdAt }) => ({ id, name, email, role, createdAt });
export async function register(input) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email already exists.');
  const { password, ...profile } = input;
  return publicUser(await prisma.user.create({ data: { ...profile, passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } }));
}
export async function login(input) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await argon2.verify(user.passwordHash, input.password))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  const token = randomToken(); const csrfToken = randomToken();
  await prisma.session.create({ data: { userId: user.id, tokenHash: sha256(token), csrfHash: sha256(csrfToken), expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 86400000) } });
  return { user: publicUser(user), token, csrfToken };
}
export { publicUser };
