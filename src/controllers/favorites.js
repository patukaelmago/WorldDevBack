const { User, Room } = require('../db');
const { httpError } = require('../security');
async function getFavoritesIdsByUserId(id) {
  const user = await User.findByPk(id);
  return user ? user.favorites : [];
}
async function getFavoritesByUserId(id) {
  return Room.findAll({ where: { id: await getFavoritesIdsByUserId(id) } });
}
async function addFavorites({ id, favorites }) {
  if (!Array.isArray(favorites) || favorites.length !== 1) throw httpError(400, 'Select one room.');
  if (!await Room.findByPk(favorites[0])) throw httpError(404, 'Room not found.');
  const user = await User.findByPk(id);
  await user.update({ favorites: [...new Set([...user.favorites, ...favorites])] });
  return 'Favorite added.';
}
async function deleteFavorites({ id, favorite }) {
  const user = await User.findByPk(id);
  await user.update({ favorites: user.favorites.filter(f => f !== favorite) });
  return 'Favorite removed.';
}
module.exports = { getFavoritesIdsByUserId, getFavoritesByUserId, addFavorites, deleteFavorites };
