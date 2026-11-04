const { User } = require('../db');
const { httpError } = require('../security');
const publicProfile = u => ({ ...u.profile, id: u.id, email: u.email, rol: u.rol, blocked: u.blocked, favorites: u.favorites });
const fields = ['name', 'lastname', 'address', 'city', 'country', 'displayName', 'photoURL'];
const profileFields = body => Object.fromEntries(fields.filter(k => typeof body[k] === 'string').map(k => [k, body[k].slice(0, 500)]));
async function getUserById(id) {
  const user = await User.findByPk(id);
  if (!user) throw httpError(404, 'User not found.');
  return publicProfile(user);
}
async function getUsers() { return (await User.findAll({ where: { rol: 'user' } })).map(publicProfile); }
async function getAdmins() { return (await User.findAll({ where: { rol: ['admin', 'superAdmin'] } })).map(publicProfile); }
async function createUser(body) {
  const user = await User.findByPk(body.id);
  if (!user) throw httpError(404, 'Sign in before creating a profile.');
  await user.update({ profile: { ...user.profile, ...profileFields(body) } });
  return publicProfile(user);
}
async function updateUser(body, isOwner = false) {
  const user = await User.findByPk(body.id);
  if (!user) throw httpError(404, 'User not found.');
  const changes = { profile: { ...user.profile, ...profileFields(body) } };
  if (isOwner && ['user', 'admin'].includes(body.rol) && user.rol !== 'superAdmin') changes.rol = body.rol;
  await user.update(changes);
  return publicProfile(user);
}
async function userBlock({ id }) {
  const user = await User.findByPk(id);
  if (!user) throw httpError(404, 'User not found.');
  if (user.rol === 'superAdmin') throw httpError(403, 'The owner cannot be blocked.');
  await user.update({ blocked: !user.blocked });
  return 'User updated.';
}
async function deleteUser(id) {
  const user = await User.findByPk(id);
  if (!user) throw httpError(404, 'User not found.');
  if (user.rol === 'superAdmin') throw httpError(403, 'The owner cannot be deleted.');
  await user.destroy();
  return 'User profile deleted.';
}
module.exports = { getUsers, getAdmins, getUserById, createUser, updateUser, userBlock, deleteUser };
