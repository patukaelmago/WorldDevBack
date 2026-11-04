const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const admin = require('firebase-admin');
process.env.DATABASE_URL = 'postgresql://test:test@localhost/worlddev';
process.env.FIREBASE_PROJECT_ID = 'world-developer';
process.env.ADMIN_EMAILS = 'owner@example.test';
const db = require('../src/db');
const app = require('../src/app');
let profiles;
let identity;
let rejectToken;
beforeEach(() => {
  profiles = new Map();
  identity = { uid: 'user-1', email: 'guest@example.test', email_verified: true };
  rejectToken = false;
  admin.apps.length || admin.initializeApp({ projectId: 'world-developer' });
  admin.apps[0].auth().verifyIdToken = async () => {
    if (rejectToken) throw new Error('Invalid token');
    return identity;
  };
  db.User.findOrCreate = async ({ where, defaults }) => {
    const user = profiles.get(where.id) || { ...defaults, id: where.id, favorites: [], blocked: false, async update(changes) { Object.assign(this, changes); return this; } };
    profiles.set(user.id, user); return [user, true];
  };
  db.User.findByPk = async id => profiles.get(id);
});
test('catalogue mutations, user lists and reservations require a session', async () => {
  for (const [method,path] of [['post','/hotels'],['put','/rooms'],['delete','/events/some-id'],['get','/users'],['get','/books'],['post','/booking']]) {
    await request(app)[method](path).send({}).expect(401);
  }
});
test('invalid Firebase tokens are rejected', async () => {
  rejectToken = true;
  await request(app).get('/users/user-1').set('Authorization','Bearer forged').expect(401);
});
test('ordinary users cannot read another profile or modify catalogue', async () => {
  await request(app).get('/users/other-user').set('Authorization','Bearer valid').expect(403);
  await request(app).post('/hotels').set('Authorization','Bearer valid').send({}).expect(403);
});
test('a submitted role cannot grant admin privileges', async () => {
  await request(app).post('/users').set('Authorization','Bearer valid').send({ id:'user-1', rol:'superAdmin', displayName:'Guest' }).expect(200);
  assert.equal(profiles.get('user-1').rol,'user');
  await request(app).put('/users').set('Authorization','Bearer valid').send({ id:'user-1', rol:'admin' }).expect(200);
  assert.equal(profiles.get('user-1').rol,'user');
});
test('only the configured verified email receives owner privileges', async () => {
  identity.email='owner@example.test'; identity.email_verified=false;
  const first=await request(app).get('/users/user-1').set('Authorization','Bearer valid').expect(200);
  assert.equal(first.body.rol,'user');
  identity.email_verified=true;
  const verified=await request(app).get('/users/user-1').set('Authorization','Bearer valid').expect(200);
  assert.equal(verified.body.rol,'superAdmin');
});
test('demo checkout does not send a payment request', async () => {
  const res=await request(app).post('/stripe').set('Authorization','Bearer valid').send({amount:1}).expect(409);
  assert.match(res.body.message,/No card payments/);
});
test('database outages produce an unavailable health response without credentials', async () => {
  db.conn.authenticate = async () => { throw new Error('private database URL'); };
  const res=await request(app).get('/health').expect(503);
  assert.equal(res.body.status,'unavailable');
  assert.ok(!res.text.includes('private database'));
});
