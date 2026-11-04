const { conn, Hotel, Room, Event, Location, ServicesHotel, ServicesRoom } = require('./db');
const photo = id => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=1200&q=80';
const hotels = [
  ['World Dev Riverside', 'Rosario', 'Santa Fe', 'Rosario', 'Av. de la Costa 1200', 'Coworking by the river, a quiet workspace and a comfortable stay in Rosario.', 'photo-1566073771259-6a8506099945'],
  ['World Dev Sierras', 'Villa Carlos Paz', 'Córdoba', 'Punilla', 'Av. San Martín 800', 'Mountain views, collaborative workspaces and time to recharge between projects.', 'photo-1542314831-068cd1dbfeeb'],
  ['World Dev Palermo', 'Buenos Aires', 'Buenos Aires', 'Capital Federal', 'Av. Santa Fe 3800', 'A city retreat for remote developers, with meeting spaces and local tech events.', 'photo-1551882547-ff40c63fe5fa'],
  ['World Dev Andes', 'Mendoza', 'Mendoza', 'Capital', 'Av. Belgrano 900', 'Focus sessions, a welcoming community and the Andes on your doorstep.', 'photo-1571896349842-33c89424de2d']
];
async function seedDemo() {
  if (await Hotel.count()) return;
  await conn.transaction(async transaction => {
    const wifi = await ServicesHotel.create({ name: 'Coworking & Wi-Fi', description: 'Fast internet and a dedicated coworking area.', image: photo('photo-1497366811353-6870744d04b2') }, { transaction });
    const relax = await ServicesHotel.create({ name: 'Pool & relaxation', description: 'Shared spaces to unwind after a day of coding.', image: photo('photo-1571896349842-33c89424de2d') }, { transaction });
    const desk = await ServicesRoom.create({ name: 'Work desk', image: photo('photo-1497366811353-6870744d04b2') }, { transaction });
    for (let i = 0; i < hotels.length; i++) {
      const [name,city,state,department,address,description,image] = hotels[i];
      const location = await Location.create({ city, state, department }, { transaction });
      const hotel = await Hotel.create({ name, address, description: description + ' Demonstration property for the Henry group project; not a real hotel listing.', qualification: i % 2 ? 4 : 5, image: [photo(image)] }, { transaction });
      await hotel.addLocation(location, { transaction });
      await hotel.addServicesHotels([wifi,relax], { transaction });
      for (let j = 0; j < 2; j++) {
        const room = await Room.create({ name: j ? 'Developer Suite' : 'Focus Room', category: j ? 'Suite' : 'Double', description: 'Comfortable room with private bathroom, workspace and Wi-Fi. Demo rates in USD per night.', image: [photo(j ? 'photo-1582719478250-c89cae4dc85b' : 'photo-1611892440504-42a792e24d32')], price: 70 + i * 15 + j * 45, stock: 4, available: true, discount: false }, { transaction });
        await hotel.addRoom(room, { transaction });
        await room.addServicesRoom(desk, { transaction });
      }
      const date = new Date(Date.now() + (30 + i * 14) * 86400000);
      const event = await Event.create({ name: ['Frontend Community Meetup','Remote Work & Code','Full Stack Workshop','AI for Developers'][i], description: 'A demonstration tech event for the World Developers portfolio.', image: photo('photo-1519389950473-47ba0277781c'), date, time: '18:00:00' }, { transaction });
      await hotel.addEvent(event, { transaction });
    }
  });
  console.log('Demo catalogue is ready.');
}
module.exports = { seedDemo };
