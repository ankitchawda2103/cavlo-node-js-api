const { Server } = require("socket.io");
const { pool } = require("./config/db"); // Assuming pool is set up for PostgreSQL
const redisClient = require("./config/redisClient");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
    path: "/socket.io",
    methods: ["GET", "POST"],
  });

  io.on("connection", (socket) => {
    console.log(`New connection: ${socket.id}`);

    // Handle restaurant connection
    socket.on("join_restaurant", (restaurantId) => {
      socket.join(`restaurant_${restaurantId}`);
      console.log(`Restaurant ${restaurantId} joined room`);
    });

    // Handle user connection
    socket.on("join_user", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room`);
    });

    // Handle delivery partner connection
    socket.on("join_delivery_partner", (deliveryPartnerId) => {
      socket.join(`delivery_${deliveryPartnerId}`);
      console.log(`Delivery Partner ${deliveryPartnerId} joined their room`);
    });

    // Handle location updates from delivery partners
    socket.on("location_update", async ({ deliveryPartnerId, location }) => {
      const redisKey = `partner_location:${deliveryPartnerId}`;

      // Store the latest location in Redis with a short expiry (optional)
      await redisClient.set(redisKey, JSON.stringify(location), "EX", 300); // Expire after 5 minutes

      const orderId = await getOrderByPartnerId(deliveryPartnerId);
      if (orderId) {
        // Notify the user and restaurant with real-time delivery location updates
        io.to(`user_${orderId.user_id}`).emit("delivery_tracking", {
          orderId: orderId.id,
          location,
        });

        io.to(`restaurant_${orderId.restaurant_id}`).emit("delivery_tracking", {
          orderId: orderId.id,
          location,
        });

        console.log(
          `Location update for delivery partner ${deliveryPartnerId}:`,
          location
        );
      }
    });

    // Periodic Location Broadcast from Redis
    setInterval(async () => {
      const keys = await redisClient.keys("partner_location:*");
      for (const key of keys) {
        const deliveryPartnerId = key.split(":"[1]);
        const location = JSON.parse(await redisClient.get(key));
        const orderId = await getOrderByPartnerId(deliveryPartnerId);

        if (orderId) {
          io.to(`user_${orderId.user_id}`).emit("delivery_tracking", {
            orderId: orderId.id,
            location,
          });

          io.to(`restaurant_${orderId.restaurant_id}`).emit(
            "delivery_tracking",
            {
              orderId: orderId.id,
              location,
            }
          );

          console.log(
            `Broadcast location for partner ${deliveryPartnerId}:`,
            location
          );
        }
      }
    }, 5000); // Broadcast every 5 seconds

    // Restaurant accepts the order

    socket.on("accept_order", async (order) => {
      console.log("dffadkkjadsfhkjhkafdshk0",order);
      const updatedOrder = await updateOrderStatus(order.id, {
        delivery_status: "preparing",
      });
      let restaurantId = order.restaurant_id;
      const restaurant = await getRestaurantById(order.restaurant_id);
      const user = await getUserById(order.user_id);

      if (updatedOrder) {
        const redisKey = `orders:${restaurantId}`;
        let orders = JSON.parse(await redisClient.get(redisKey)) || [];
        orders = orders.filter((ord) => ord.id !== parseInt(order.id));
        await redisClient.set(redisKey, JSON.stringify(orders));
        // Notify Restaurant via Socket.io
        io.to(`restaurant_${restaurantId}`).emit("new_order", orders.reverse());

        // Notify user about order acceptance
        io.to(`user_${order.user_id}`).emit("order_status", {
          message: "Your order has been accepted by the restaurant.",
          order: updatedOrder,
          restaurant: restaurant,
        });

        const nearbyPartners = await findAndNotifyDeliveryPartners(
          updatedOrder,
          restaurant
        );
        if (nearbyPartners.length > 0) {
          for (const partner of nearbyPartners) {
            console.log(`delivery_${partner.id}`);

            // Emit the order assignment with both distances
            io.to(`delivery_${partner.id}`).emit("new_order_assignment", {
              message: "New order available for delivery",
              order: updatedOrder,
              restaurant: restaurant,
              user: user,
              distance_from_restaurant: partner.distance_from_restaurant,
              distance_to_user: partner.distance_to_user,
            });
          }
          console.log("Order sent to nearby delivery partners with distances.");
        } else {
          console.log("No nearby delivery partners found");
        }
      } else {
        console.log("Error in updating order");
      }
    });

    socket.on("cancelled_order", async (order) => {
      const updatedOrder = await updateOrderStatus(order.id, {
        delivery_status: "cancelled",
        status: "cancelled",
      });
      let restaurantId = order.restaurant_id;
      if (updatedOrder) {
        const redisKey = `orders:${restaurantId}`;
        let orders = JSON.parse(await redisClient.get(redisKey)) || [];
        orders = orders.filter((ord) => ord.id !== parseInt(order.id));
        await redisClient.set(redisKey, JSON.stringify(orders));
        // Notify Restaurant via Socket.io
        io.to(`restaurant_${restaurantId}`).emit("new_order", orders.reverse());

        // Notify user about order cancellation
        io.to(`user_${order.user_id}`).emit("order_status", {
          message: "Your order has been cancelled.",
          order: updatedOrder,
        });
      } else {
        console.log("Error in updating order");
      }
    });

    socket.on("delivery_accept", async (data) => {
      const otp = generateOtp();
      const updatedOrder = await assignOrderToDeliveryPartner(
        data.partner_id,
        otp,
        data.order_id
      );

      if (updatedOrder) {
        console.log(
          `Order ${data.order_id} accepted by delivery partner ${data.partner_id}`
        );

        const restaurant = await getRestaurantById(updatedOrder.restaurant_id);
        const partner = await getPartnerById(data.partner_id);
        // Notify user about delivery partner assignment

        io.to(`user_${updatedOrder.user_id}`).emit("order_status", {
          message: "Your order has been assigned to a delivery partner.",
          order: updatedOrder,
          restaurant,
          partner,
          otp,
        });
      }
    });

    socket.on("out_for_delivery", async (order_id) => {
      const updatedOrder = await updateOrderStatus(order_id, {
        delivery_status: "out for delivery",
      });
      if (updatedOrder) {
        console.log(`Order ${order_id} is out for delivery`);

        // Notify user that order is out for delivery
        io.to(`user_${updatedOrder.user_id}`).emit("order_status", {
          message: "Your order is now out for delivery.",
          order: updatedOrder,
          otp: updatedOrder.random_string,
        });

        io.to(`delivery_${updatedOrder.delivery_partner_id}`).emit(
          "order_status",
          {
            message: "order detail get successfully",
            order: updatedOrder,
          }
        );
      }
    });
  });

  return io;
};

const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const getPartnerById = async (partner_id) => {
  const query = `SELECT * FROM delivery_partners WHERE id = $1;`;
  const result = await pool.query(query, [partner_id]);
  return result.rows[0];
};

const getRestaurantById = async (restaurant_id) => {
  const query = `SELECT * FROM restaurants WHERE id = $1;`;
  const result = await pool.query(query, [restaurant_id]);
  return result.rows[0];
};

const getUserById = async (user_id) => {
  const query = `SELECT * FROM users WHERE id = $1;`;
  const result = await pool.query(query, [user_id]);
  return result.rows[0];
};

const updateOrderStatus = async (order_id, data) => {
  console.log("sadddddddddddddddd....................", order_id, data);

  const { status = "pending", delivery_status, refund_status } = data;

  console.log("sadddddddddddddddd", order_id, data);
  // Update the order
  const query = `
      UPDATE orders
      SET 
          delivery_status = COALESCE($1, delivery_status),
          refund_status = COALESCE($2, refund_status),
          status = COALESCE($3, refund_status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
  `;
  const result = await pool.query(query, [
    delivery_status,
    refund_status,
    status,
    order_id,
  ]);
  console.log("dsfaaaaaaaa", result.rows[0]);
  return result.rows[0];
};

const assignOrderToDeliveryPartner = async (
  deliveryPartnerId,
  random_string,
  orderId
) => {
  // Assign the delivery partner to the order
  console.log("dsffffffffffffff", deliveryPartnerId, random_string, orderId);
  const query = `
      UPDATE orders
      SET delivery_partner_id = $1, random_string=$2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND delivery_status = 'preparing'
      RETURNING *;
  `;

  const result = await pool.query(query, [
    deliveryPartnerId,
    random_string,
    orderId,
  ]);
  console.log("fdsssssssss", result.rows[0]);
  return result.rows[0];
};

const getOrderByPartnerId = async (partnerId) => {
  const query = `SELECT id, user_id, restaurant_id FROM orders WHERE delivery_partner_id = $1 AND delivery_status = 'out for delivery';`;
  const result = await pool.query(query, [partnerId]);
  return result.rows[0];
};

const findAndNotifyDeliveryPartners = async (order, restaurant) => {
  const { delivery_address } = order;

  const query = `
    SELECT id, name, lat, lng, distance_from_restaurant, distance_to_user
    FROM (
      SELECT id, name, lat, lng,
             (6371 * acos(
                cos(radians($1)) * cos(radians(lat)) *
                cos(radians(lng) - radians($2)) +
                sin(radians($1)) * sin(radians(lat))
             )) AS distance_from_restaurant,
             (6371 * acos(
                cos(radians($3)) * cos(radians(lat)) *
                cos(radians(lng) - radians($4)) +
                sin(radians($3)) * sin(radians(lat))
             )) AS distance_to_user
      FROM delivery_partners
      WHERE is_available = TRUE
    ) AS distances
    WHERE distance_from_restaurant <= $5
    ORDER BY distance_from_restaurant;
  `;

  const radius = 10; // 2 km search radius from the restaurant
  const result = await pool.query(query, [
    restaurant.lat,
    restaurant.lng,
    delivery_address.lat,
    delivery_address.lng,
    radius,
  ]);

  return result.rows;
};
const getIO = () => io;

module.exports = { initializeSocket, getIO };
