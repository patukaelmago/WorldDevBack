const { Booking } = require('../db')

const getBooks= async () => {
    try {
        const books = await Booking.findAll()
        if (books) {
            const onlyBooks = books.map(e=>e.cartRoom).flat()
            return onlyBooks
        }else{
            return 'Bookings not found'
        }
        

    } catch (error) { throw error; }
}

module.exports={
    getBooks
}