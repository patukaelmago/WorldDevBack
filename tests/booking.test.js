const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_URL = 'postgresql://test:test@localhost/worlddev';
const db = require('../src/db');
const { postBooking } = require('../src/controllers/booking');
let existing;
let stock;
let created;
const start = new Date(Date.now() + 10 * 86400000).toISOString().slice(0,10);
const end = new Date(Date.now() + 12 * 86400000).toISOString().slice(0,10);
const input = () => ({ user:'guest', cartTotalAmount:1, status:'paid', cartRoom:[{id:'room-1',checkIn:start,checkOut:end,cartQuantity:2,price:1,newStock:999}] });
beforeEach(() => {
  existing=[]; stock=3; created=null;
  db.conn.transaction=async fn=>fn({LOCK:{UPDATE:'UPDATE'}});
  db.Room.findAll=async options=>{
    assert.equal(options.lock,'UPDATE');
    return [{id:'room-1',name:'Focus Room',available:true,stock,price:100,image:[],getHotels:async()=>[{id:'hotel-1',name:'Demo Hotel',address:'Demo'}]}];
  };
  db.Booking.findAll=async()=>existing;
  db.Booking.create=async values=>{created={...values,id:'booking-1',addRooms:async()=>{}};return created;};
});
test('reservation amount and identity are calculated on the server', async()=>{
 const result=await postBooking(input());
 assert.equal(result.cartTotalAmount,400);
 assert.equal(result.cartTotalQuantity,2);
 assert.equal(result.status,'confirmed');
 assert.equal(result.cartRoom[0].price,100);
 assert.equal(result.cartRoom[0].demo,true);
});
test('overlapping reservations cannot exceed stock', async()=>{
 existing=[{cartRoom:[{id:'room-1',checkIn:start,checkOut:end,cartQuantity:2,status:'confirmed'}]}];
 await assert.rejects(postBooking(input()),e=>e.status===409);
 assert.equal(created,null);
});
test('adjacent stays do not consume stock for the next stay', async()=>{
 existing=[{cartRoom:[{id:'room-1',checkIn:'2026-01-01',checkOut:start,cartQuantity:3,status:'confirmed'}]}];
 await postBooking(input()); assert.equal(created.cartTotalAmount,400);
});
test('invalid dates, quantities and duplicate room rows are rejected', async()=>{
 let data=input();data.cartRoom[0].checkOut=start;
 await assert.rejects(postBooking(data),e=>e.status===400);
 data=input();data.cartRoom[0].cartQuantity=-1;
 await assert.rejects(postBooking(data),e=>e.status===400);
 data=input();data.cartRoom.push({...data.cartRoom[0]});
 await assert.rejects(postBooking(data),e=>e.status===400);
});
