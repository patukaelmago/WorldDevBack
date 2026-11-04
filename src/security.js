const admin = require('firebase-admin');
const { User, Booking } = require('./db');
const httpError = (status, message) => Object.assign(new Error(message), { status });
const admins = () => (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
async function authenticate(req, res, next) {
  const token = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  if (!token) return next(httpError(401, 'Sign in to continue.'));
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) throw httpError(503, 'Authentication is not configured.');
    // Verify ID tokens using Google's public certificates. No private key needed.
    const app = admin.apps[0] || admin.initializeApp({ projectId });
    const identity = await app.auth().verifyIdToken(token[1]);
    if (!identity.email) throw httpError(403, 'An email address is required.');
    const owner = identity.email_verified === true && admins().includes(identity.email.toLowerCase());
    const [user] = await User.findOrCreate({ where: { id: identity.uid }, defaults: {
      email: identity.email, rol: owner ? 'superAdmin' : 'user',
      profile: { displayName: identity.name || '', photoURL: identity.picture || '' }
    } });
    if (user.blocked) throw httpError(403, 'This account is blocked.');
    if (owner && user.rol !== 'superAdmin') await user.update({ rol: 'superAdmin' });
    req.identity = identity;
    req.user = user;
    req.isAdmin = owner || user.rol === 'admin';
    req.isOwner = owner;
    next();
  } catch (error) { next(error.status ? error : httpError(401, 'Your session is invalid or expired.')); }
}
const requireAdmin = (req, res, next) => req.isAdmin ? next() : next(httpError(403, 'Administrator access required.'));
const requireOwner = (req, res, next) => req.isOwner ? next() : next(httpError(403, 'Owner access required.'));
const requireSelf = (req, res, next) => {
  const id = req.params.id || req.body.id;
  return id === req.user.id || req.isAdmin ? next() : next(httpError(403, 'You can only access your own account.'));
};
async function authorizeBooking(req, res, next) {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) throw httpError(404, 'Reservation not found.');
    if (!req.isAdmin && booking.user !== req.user.id) throw httpError(403, 'Access denied.');
    req.booking = booking;
    next();
  } catch (error) { next(error); }
}
module.exports = { authenticate, requireAdmin, requireOwner, requireSelf, authorizeBooking, httpError };
