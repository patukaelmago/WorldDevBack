// Public, read-only portfolio previews. This is never a Firebase identity.
// Only fabricated people/reservations are returned; real private tables are not queried.
const DEMO_HEADER = 'x-world-developers-demo';
const DEMO_MODE = 'readonly-v1';
const demoOwner = { id: 'demo-superadmin', email: 'demo@worlddevelopers.example', name: 'Demo', lastname: 'Superadmin', displayName: 'Demo Superadmin', rol: 'superAdmin', blocked: false, favorites: [], readonly: true };
const people = [demoOwner,
  { id: 'demo-admin', email: 'manager@example.test', name: 'Sample', lastname: 'Manager', rol: 'admin', hotel: 'World Dev Riverside', blocked: false },
  { id: 'demo-guest-1', email: 'alex@example.test', name: 'Alex', lastname: 'Example', rol: 'user', blocked: false },
  { id: 'demo-guest-2', email: 'sam@example.test', name: 'Sam', lastname: 'Example', rol: 'user', blocked: false }
];
function sampleBookings() {
  const date = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  return ['confirmed', 'cancelled'].map((status, i) => ({
    id: `demo-booking-${i + 1}`, user: 'demo-superadmin', status,
    cartTotalQuantity: 1, cartTotalAmount: i ? 230 : 140,
    cartRoom: [{ id: `demo-room-${i + 1}`, user: 'demo-superadmin', idHotel: `demo-hotel-${i + 1}`,
      hotel: i ? 'World Dev Andes' : 'World Dev Riverside', address: 'Sample address', name: i ? 'Developer Suite' : 'Focus Room',
      price: i ? 115 : 70, cartQuantity: 1, newStock: 3, status,
      date: date(-1), checkIn: date(7 + i), checkOut: date(9 + i) }]
  }));
}
function readOnlyDemo(req, res, next) {
  if (req.get(DEMO_HEADER) !== DEMO_MODE) return next();
  res.setHeader('X-World-Developers-Demo', 'readonly');
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(403).json({ message: 'Read-only demo: changes are not allowed.' });
  const path = req.path.replace(/\/+$/, '') || '/';
  if (path === '/users') return res.json(people.filter(person => person.rol === 'user'));
  if (path === '/users/admins') return res.json(people.filter(person => person.rol !== 'user'));
  if (path.startsWith('/users/')) {
    const person = people.find(person => person.id === path.split('/')[2]);
    return person ? res.json(person) : res.status(404).json({ message: 'Sample user not found.' });
  }
  if (path === '/books') return res.json(sampleBookings().flatMap(booking => booking.cartRoom));
  if (path === '/booking' || path === '/booking/user/demo-superadmin') return res.json(sampleBookings());
  if (path.startsWith('/booking/')) {
    const booking = sampleBookings().find(booking => booking.id === path.split('/')[2]);
    return booking ? res.json(booking) : res.status(404).json({ message: 'Sample reservation not found.' });
  }
  if (path.startsWith('/favorites/')) return res.json([]);
  // Explicit allowlist: future private endpoints cannot accidentally leak through.
  if (/^\/(hotels|rooms|events|locations|serviceHotels|serviceRooms|filtersHotels|filtersRooms|reviews)(\/|$)/.test(path) || path === '/health') return next();
  return res.status(403).json({ message: 'This resource is not available in the read-only demo.' });
}
module.exports = { readOnlyDemo, DEMO_HEADER, DEMO_MODE };
