import 'dotenv/config';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL } } });
const app = createApp();
const emails = [];
afterAll(async () => { await prisma.session.deleteMany({ where: { user: { email: { in: emails } } } }); await prisma.user.deleteMany({ where: { email: { in: emails } } }); await prisma.$disconnect(); });

describe('authentication API against PostgreSQL', () => {
  it('registers only a CUSTOMER and creates an HTTP-only session on login', async () => {
    const email = `api-${crypto.randomUUID()}@test.dev`; emails.push(email);
    const registered = await request(app).post('/api/v1/auth/register').send({ name: 'API Customer', email, password: 'Customer123!' });
    expect(registered.status).toBe(201); expect(registered.body.data.role).toBe('CUSTOMER'); expect(registered.body.data).not.toHaveProperty('passwordHash');
    const agent = request.agent(app); const login = await agent.post('/api/v1/auth/login').send({ email, password: 'Customer123!' });
    expect(login.status).toBe(200); expect(login.headers['set-cookie'].some((value) => value.includes('orderflow_session=') && value.includes('HttpOnly'))).toBe(true);
    expect((await agent.get('/api/v1/auth/me')).body.data.user.email).toBe(email);
    expect((await agent.get('/api/v1/admin/dashboard')).status).toBe(403);
  });

  it('rejects invalid credentials without revealing which field failed', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: `missing-${crypto.randomUUID()}@test.dev`, password: 'WrongPassword1!' });
    expect(response.status).toBe(401); expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
