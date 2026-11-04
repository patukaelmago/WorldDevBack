const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
process.env.DATABASE_URL = 'postgresql://test:test@localhost/worlddev';
process.env.FIREBASE_PROJECT_ID = 'world-developer';
const db = require('../src/db');
const app = require('../src/app');
const { DEMO_HEADER, DEMO_MODE } = require('../src/demo');
test('demo dashboards contain fabricated data and never query private tables', async () => {
  for (const model of [db.User, db.Booking]) {
    for (const operation of ['findAll','findByPk','findOrCreate']) model[operation] = async () => { throw new Error('Private table accessed'); };
  }
  for (const path of ['/users','/users/admins','/users/demo-superadmin','/booking','/booking/user/demo-superadmin','/books']) {
    const result = await request(app).get(path).set(DEMO_HEADER, DEMO_MODE).expect(200);
    assert.ok(result.text.includes('demo') || result.text.includes('example.test'));
    assert.ok(!result.text.includes('patriciouskaer'));
  }
  await request(app).get('/users/real-user').set(DEMO_HEADER, DEMO_MODE).expect(404);
  await request(app).get('/private-future-endpoint').set(DEMO_HEADER, DEMO_MODE).expect(403);
});
test('every demo mutation is rejected, even if a real bearer token is also supplied', async () => {
  for (const method of ['post','put','patch','delete']) {
    for (const path of ['/hotels','/rooms','/events','/users/admins','/users/blocked','/booking/status','/favorites','/stripe']) {
      const result = await request(app)[method](path).set(DEMO_HEADER, DEMO_MODE).set('Authorization','Bearer real-owner-token').send({ rol:'superAdmin' }).expect(403);
      assert.match(result.body.message, /Read-only demo/);
    }
  }
});
test('a demo marker or demo identity cannot authorize real private routes', async () => {
  await request(app).get('/users').set('Authorization','Bearer readonly-v1').expect(401);
  await request(app).get('/users').set(DEMO_HEADER,'wrong-value').expect(401);
});
