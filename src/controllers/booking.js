const { conn, Booking, Room, Hotel } = require('../db');
const { httpError } = require('../security');
function dateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw httpError(400, 'Choose valid arrival and departure dates.');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== value) throw httpError(400, 'Invalid date.');
  return date;
}
async function postBooking({ cartRoom, user }) {
  if (!Array.isArray(cartRoom) || cartRoom.length < 1 || cartRoom.length > 20) throw httpError(400, 'Your cart must contain between 1 and 20 rooms.');
  if (new Set(cartRoom.map(r => r.id)).size !== cartRoom.length) throw httpError(400, 'Duplicate rooms are not allowed.');
  return conn.transaction(async transaction => {
    const ids = cartRoom.map(r => r.id).sort();
    // Lock in a stable order; concurrent checkouts cannot overbook the same room.
    const rooms = await Room.findAll({ where: { id: ids }, order: [['id','ASC']], transaction, lock: transaction.LOCK.UPDATE });
    const existing = await Booking.findAll({ where: { status: 'confirmed' }, transaction });
    const items = [];
    let total = 0;
    let quantity = 0;
    for (const input of cartRoom) {
      const room = rooms.find(r => r.id === input.id);
      if (!room || !room.available) throw httpError(409, 'A room is no longer available.');
      const count = Number(input.cartQuantity);
      if (!Number.isSafeInteger(count) || count < 1 || count > 20) throw httpError(400, 'Invalid room quantity.');
      const start = dateOnly(input.checkIn);
      const end = dateOnly(input.checkOut);
      const nights = (end - start) / 86400000;
      if (nights < 1 || nights > 365 || start < new Date(new Date().toISOString().slice(0,10) + 'T00:00:00Z')) throw httpError(400, 'Choose a future stay of 1 to 365 nights.');
      const booked = existing.flatMap(b => b.cartRoom).filter(item => item.id === room.id && item.status !== 'cancelled' && item.status !== 'canceled' && item.checkIn < input.checkOut && item.checkOut > input.checkIn).reduce((sum, item) => sum + Number(item.cartQuantity), 0);
      if (booked + count > room.stock) throw httpError(409, 'Not enough rooms available for those dates.');
      const hotels = await room.getHotels({ transaction });
      const hotel = hotels[0];
      const price = Number(room.price);
      if (!Number.isSafeInteger(price) || price < 0) throw httpError(409, 'This room has no valid rate.');
      total += price * count * nights;
      quantity += count;
      items.push({ id: room.id, name: room.name, image: room.image, price, cartQuantity: count, checkIn: input.checkIn, checkOut: input.checkOut, nights, newStock: room.stock - booked - count, hotel: hotel?.name || '', idHotel: hotel?.id || '', address: hotel?.address || '', user, date: new Date().toISOString().slice(0,10), status: 'confirmed', demo: true });
    }
    const booking = await Booking.create({ cartTotalQuantity: quantity, cartTotalAmount: total, cartRoom: items, user, status: 'confirmed' }, { transaction });
    await booking.addRooms(rooms, { transaction });
    return booking;
  });
}
const getAllBooking = () => Booking.findAll({ order: [['createdAt','DESC']] });
const getBookingsByUserId = user => Booking.findAll({ where: { user }, order: [['createdAt','DESC']] });
const getBookingById = id => Booking.findByPk(id);
async function modifyBooking({ id, status }) {
  if (!['confirmed','cancelled','canceled'].includes(status)) throw httpError(400, 'Invalid reservation status.');
  const booking = await Booking.findByPk(id);
  if (!booking) throw httpError(404, 'Reservation not found.');
  await booking.update({ status, cartRoom: booking.cartRoom.map(item => ({ ...item, status })) });
  return 'Reservation updated.';
}
async function modifyStatus({ user, id, status }) {
  if (!['confirmed','cancelled','canceled'].includes(status)) throw httpError(400, 'Invalid reservation status.');
  for (const booking of await getBookingsByUserId(user)) {
    const items = booking.cartRoom.map(item => item.id === id ? { ...item, status } : item);
    await booking.update({ cartRoom: items, status: items.every(item => ['cancelled','canceled'].includes(item.status)) ? 'cancelled' : 'confirmed' });
  }
  return 'Reservation updated.';
}
module.exports = { postBooking, getAllBooking, getBookingsByUserId, getBookingById, modifyBooking, modifyStatus };
