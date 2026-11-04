const router = require('express').Router();
const { authenticate, requireAdmin, requireSelf } = require('../security');
const publicCatalog = (req, res, next) => req.method === 'GET' ? next() : authenticate(req, res, error => error ? next(error) : requireAdmin(req, res, next));
for (const [path, file] of Object.entries({
  rooms: 'roomRoutes', hotels: 'hotelRoutes', filtersHotels: 'filtersHRoutes', filtersRooms: 'filtersRRoutes',
  serviceHotels: 'servicesHotel', serviceRooms: 'servicesRoom', events: 'events', locations: 'locations'
})) router.use('/' + path, publicCatalog, require('../middlewares/' + file));
router.use('/users', require('../middlewares/users'));
router.use('/favorites', authenticate, (req, res, next) => {
  const id = req.method === 'GET' ? req.path.split('/').filter(Boolean).pop() : req.body.id;
  req.params.id = id;
  requireSelf(req, res, next);
}, require('../middlewares/favorites'));
router.use('/reviews', (req, res, next) => {
  if (req.method === 'GET') return next();
  authenticate(req, res, error => {
    if (error) return next(error);
    if (req.method !== 'POST') return requireAdmin(req, res, next);
    req.body.user = req.user.id;
    req.body.name = req.identity.name || req.user.profile.displayName || 'Guest';
    next();
  });
}, require('../middlewares/reviews'));
router.use('/booking', require('../middlewares/bookingRoutes'));
router.use('/books', authenticate, requireAdmin, require('../middlewares/book'));
router.post('/stripe', authenticate, (req, res) => res.status(409).json({ message: 'This portfolio is a demonstration. No card payments are accepted. Use the demo reservation checkout.' }));
module.exports = router;
