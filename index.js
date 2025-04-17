require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const couponRoutes = require('./routes/couponRoutes');
const addressRoutes = require('./routes/addressRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const deliveryPartnerRoutes = require('./routes/deliveryPartnerRoutes');
const { connectDB } = require('./config/db');

const http = require('http');
const { initializeSocket } = require('./socket');

// Initialize Express app
const app = express();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.io Server is running');
}); 
initializeSocket(server);

server.listen(process.env.SOCKET_PORT || 3001, () => {
  console.log(`Socket Server is running on port ${process.env.SOCKET_PORT || 3001}`);
});
// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/coupon', couponRoutes);
app.use('/api/address', addressRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/menu', menuItemRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/delivery', deliveryRoutes);


app.use('/api/delivery-partner', deliveryPartnerRoutes);

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});
