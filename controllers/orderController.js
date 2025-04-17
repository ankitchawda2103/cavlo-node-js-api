const { pool } = require("../config/db"); // Assuming pool is set up for PostgreSQL
const { getIO } = require("../socket");
const redisClient = require("../config/redisClient");
//Get All Orders
const getAllOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    // Query to fetch all orders for a specific user
    const query = `
            SELECT 
                o.id AS order_id, 
                o.total_amount, 
                o.payment_method, 
                o.delivery_status, 
                o.refund_status, 
                o.created_at, 
                o.updated_at,
                r.name AS restaurant_name,
                r.address AS restaurant_address,
                r.phone_number AS restaurant_phone,
                d.name AS delivery_partner_name,
                d.phone_number AS delivery_partner_phone,
                json_agg(
                    json_build_object(
                        'item_id', oi.menu_item_id,
                        'name', mi.name,
                        'price', oi.price,
                        'quantity', oi.quantity
                    )
                ) AS items
            FROM orders o
            LEFT JOIN restaurants r ON o.restaurant_id = r.id
            LEFT JOIN delivery_partners d ON o.delivery_partner_id = d.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE o.user_id = $1
            GROUP BY o.id, r.id, d.id
            ORDER BY o.created_at DESC;
        `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "fail",
        message: "No orders found for this user",
      });
    }

    res.status(200).json({
      code: 200,
      status: "success",
      message: "User orders fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      code: 500,
      status: "fail",
      message: "Failed to fetch user orders",
    });
  }
};

//Get User Orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user's ID
    const { status } = req.query;

    // Validate the order status query parameter
    const validStatuses = ["active", "completed", "cancelled"];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        code: 400,
        status: "fail",
        message: `Invalid status query. Must be one of: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    let statusCondition;
    if (status === "active") {
      statusCondition = `o.status IN ('pending') AND o.delivery_status != 'delivered'`;
    } else if (status === "completed") {
      statusCondition = `o.status = 'completed' AND o.delivery_status = 'delivered'`;
    } else if (status === "cancelled") {
      statusCondition = `o.status = 'cancelled' OR o.refund_status != 'not_requested'`;
    }

    // Query to fetch orders and order items
    // Query to fetch orders with restaurant details  
    const query = `
        SELECT 
        o.id AS order_id,
        o.total_amount,
        o.payment_method,
        o.status,
        o.delivery_status,
        o.refund_status,
        o.delivery_address,
        o.created_at,
        dp.name AS delivery_partner_name,
        dp.phone_number AS delivery_partner_phone,
        r.name AS restaurant_name,
        r.logo AS restaurant_image,
        o.restaurant_id,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'menu_item_id', oi.menu_item_id,
                'item_name', oi.item_name,
                'price', oi.price,
                'quantity', oi.quantity,
                'subtotal', oi.subtotal
            )
        ) AS order_items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN delivery_partners dp ON o.delivery_partner_id = dp.id
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE o.user_id = $1 AND ${statusCondition}
        GROUP BY o.id, dp.name, dp.phone_number, r.name,  r.logo,  o.restaurant_id
        ORDER BY o.created_at DESC;
        `;

    const result = await pool.query(query, [userId]);

    return res.status(200).json({
      code: 200,
      status: "success",
      message: "Orders fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      code: 500,
      status: "fail",
      message: "Failed to fetch user orders",
    });
  }
};

//Get User Orders
const getPartnerOrders = async (req, res) => {
  try {
    const partnerId = req.user.id; // Authenticated user's ID
    const { status } = req.body;

    // Validate the order status query parameter
    const validStatuses = ["active", "completed", "cancelled"];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        code: 400,
        status: "fail",
        message: `Invalid status query. Must be one of: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    let statusCondition;
    if (status === "active") {
      statusCondition = `o.status ='pending' AND o.delivery_status != 'delivered'`;
    } else if (status === "completed") {
      statusCondition = `o.status = 'completed' AND o.delivery_status = 'delivered'`;
    } else if (status === "cancelled") {
      statusCondition = `o.status = 'cancelled' OR o.refund_status != 'not_requested'`;
    }

    // Query to fetch orders and order items
    // Query to fetch orders with restaurant details
    const query = `
        SELECT 
        o.id AS order_id,
        o.total_amount,
        o.payment_method,
        o.status,
        o.delivery_status,
        o.refund_status,
        o.delivery_address,
        o.created_at,
        u.name AS user_name,
        u.phone_number AS user_phone,
        r.name AS restaurant_name,
        r.logo AS restaurant_image,
        r.address AS restaurant_address,
        r.lat As restaurant_latitude,
        r.lng As restaurant_longitude,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'menu_item_id', oi.menu_item_id,
                'item_name', oi.item_name,
                'item_image', mi.image,
                'price', oi.price,
                'quantity', oi.quantity,
                'subtotal', oi.subtotal
            )
        ) AS order_items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
        LEFT JOIN users u ON o.user_id = u.id
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE o.delivery_partner_id = $1 AND ${statusCondition}
        GROUP BY o.id, u.name, u.phone_number, r.name,  r.logo,r.address, r.lat, r.lng 
        ORDER BY o.created_at DESC;
        `;

    const result = await pool.query(query, [partnerId]);

    return res.status(200).json({
      code: 200,
      status: "success",
      message: "Orders fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      code: 500,
      status: "fail",
      message: "Failed to fetch user orders",
    });
  }
};

//Get order by id
const getOrderById = async (req, res) => {
  try {
    const { order_id } = req.body;

    // Fetch order details
    const query = `
            SELECT 
                o.id AS order_id, o.total_amount, o.payment_method, o.delivery_status, o.refund_status,
                o.created_at, o.updated_at,
                u.name AS user_name, u.phone_number AS user_phone,
                d.name AS delivery_partner_name, d.phone_number AS delivery_partner_phone,
                json_agg(oi.*) AS items
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN delivery_partners d ON o.delivery_partner_id = d.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = $1
            GROUP BY o.id, u.id, d.id;
        `;
    const result = await pool.query(query, [order_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        status: "fail",
        message: "Order not found",
      });
    }

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Order details fetched successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      code: 500,
      status: "fail",
      message: "Failed to fetch order details",
    });
  }
};

// Place order
const placeOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { address_id, paymentMethod } = req.body;

    if (!address_id || !paymentMethod) {
      return res.status(400).json({
        code: 400,
        status: "fail",
        message: "Address ID and payment method are required",
      });
    }

    await client.query("BEGIN"); // Start a transaction

    // Fetch user's address
    const addressResult = await client.query(
      `SELECT address, apartment_number, street_name, postal_code, lat, lng 
             FROM user_addresses WHERE id = $1 AND user_id = $2`,
      [address_id, userId]
    );
    if (addressResult.rows.length === 0) {
      return res.status(400).json({
        code: 400,
        status: "fail",
        message: "Address not found",
      });
    }
    const address = addressResult.rows[0];

    const cartQuery = `
        SELECT c.restaurant_id, mi.id AS menu_item_id, mi.name AS item_name, mi.price AS price, c.quantity, r.lat AS restaurant_lat, r.lng AS restaurant_lng
        FROM cart c
        JOIN menu_items mi ON c.item_id = mi.id
        JOIN restaurants r ON c.restaurant_id = r.id
        WHERE c.user_id = $1
    `;
    // Fetch cart details
    const cartResult = await client.query(cartQuery, [userId]);
    if (cartResult.rows.length === 0) {
      return res.status(400).json({
        code: 400,
        status: "fail",
        message: "Cart is empty",
      });
    }
    const cartItems = cartResult.rows;

    // Calculate the total amount
    let totalAmount = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Calculate delivery fee based on distance
    const deliveryFee = await calculateDeliveryFee(
      address.lat,
      address.lng,
      cartItems[0].restaurant_lat,
      cartItems[0].restaurant_lng
    );
    totalAmount += deliveryFee;

    let transactionReference = `ORD-${Date.now()}`;
    let paymentStatus = "pending";

    if (paymentMethod === "orange_money") {
      // Initiate Orange Money Payment
      const paymentData = {
        merchant_id: ORANGE_MONEY_MERCHANT_ID,
        amount: totalAmount,
        currency: "XOF",
        order_reference: transactionReference,
        customer_msisdn: req.user.phone_number,
        payment_method: "orange_money",
      };

      const paymentResponse = await axios.post(
        `${ORANGE_MONEY_API_URL}/orange-money/payment`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${ORANGE_MONEY_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (paymentResponse.status !== 201) {
        throw new Error("Failed to initiate Orange Money payment");
      }

      transactionReference = paymentResponse.data.transaction_reference;
      paymentStatus = "pending_payment";
    }

    // Save order with transaction reference and pending status
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount, payment_method, delivery_address, status, delivery_status, delivery_fee)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        cartItems[0].restaurant_id,
        totalAmount,
        paymentMethod,
        JSON.stringify(address),
        "pending",
        "pending",
        deliveryFee,
      ]
    );
    const orderId = orderResult.rows[0].id;
    let order = orderResult.rows[0];
    // Insert transaction record
    await client.query(
      `INSERT INTO transactions (order_id, user_id, transaction_reference, payment_method, amount, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        orderId,
        userId,
        transactionReference,
        paymentMethod,
        totalAmount,
        paymentStatus,
      ]
    );

    // Insert order items
    const orderItemsQueries = cartItems.map((item) =>
      client.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, price, quantity, subtotal)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          orderId,
          item.menu_item_id,
          item.item_name,
          item.price,
          item.quantity,
          parseFloat(item.price) * parseInt(item.quantity),
        ]
      )
    );
    await Promise.all(orderItemsQueries);

    // Clear the cart
    await client.query(`DELETE FROM cart WHERE user_id = $1`, [userId]);

    await client.query("COMMIT"); // Commit the transaction
    let restaurant_id = orderResult.rows[0].restaurant_id;
    const redisKey = `orders:${restaurant_id}`;
    let orders = JSON.parse(await redisClient.get(redisKey)) || [];
    orders.push(order);
    await redisClient.set(redisKey, JSON.stringify(orders));

    const io = getIO();
    const restaurantRoom = `restaurant_${restaurant_id}`;
    io.to(restaurantRoom).emit("new_order", orders.reverse());

    // temporary
    const userRoom = `user_${userId}`;

    setTimeout(() => {
      io.to(userRoom).emit("accept_order", order);
      console.log("order accepted", userRoom);
    }, 10000);

    return res.status(200).json({
      code: 200,
      status: "success",
      message: "Order placed successfully",
      data: {
        order: order,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        transaction_reference: transactionReference,
        delivery_status: "pending",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      code: 500,
      status: "fail",
      message: "Failed to place order",
    });
  } finally {
    client.release();
  }
};

// Checkout order
const checkoutOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { address_id, couponCode } = req.body;

    await client.query("BEGIN");

    let responseData = {};

    // 1. Fetch updated cart details
    const cartQuery = `
            SELECT c.restaurant_id,c.item_id, mi.name, mi.price, c.quantity, (mi.price * c.quantity) AS subtotal
            FROM cart c
            JOIN menu_items mi ON c.item_id = mi.id
            WHERE c.user_id = $1
        `;
    const cartResult = await client.query(cartQuery, [userId]);
    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      return res.status(400).json({
        code: 400,
        status: "fail",
        message: "Cart is empty",
      });
    }

    // 2. Calculate Total Amount
    let amount = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.subtotal),
      0
    );

    // 3. Handle Address Updates
    let deliveryAddress = null;
    if (address_id) {
      const addressQuery = `
                SELECT * FROM user_addresses 
                WHERE id = $1 AND user_id = $2
            `;
      const addressResult = await client.query(addressQuery, [
        address_id,
        userId,
      ]);
      if (addressResult.rows.length === 0) {
        return res.status(400).json({
          code: 400,
          status: "fail",
          message: "Address not found",
        });
      }
      deliveryAddress = addressResult.rows[0];
    }

    // 5. Calculate Delivery Fee
    const deliveryFee = await getDeliveryFee(
      deliveryAddress?.lat,
      deliveryAddress?.lng
    );

    let totalAmount = amount + deliveryFee;
    // 6. Handle Coupon Logic
    let discountAmount = 0;
    let couponDetails = null;

    if (couponCode) {
      const couponResponse = await applyCoupon(
        userId,
        cartItems[0].restaurant_id,
        couponCode,
        totalAmount
      );
      if (!couponResponse.success) {
        return res
          .status(400)
          .json({ code: 400, status: "fail", message: couponResponse.message });
      }
      couponDetails = couponResponse.coupon;
      discountAmount = couponResponse.discountAmount;
      totalAmount -= discountAmount;
    }

    // 8. Response Preparation
    responseData = {
      totalAmount,
      amount,
      deliveryFee,
      deliveryAddress,
      couponDetails,
      discountAmount,
    };

    await client.query("COMMIT");

    res.status(200).json({
      code: 200,
      status: "success",
      message: "Checkout data fetched successfully",
      data: responseData,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({
      code: 500,
      status: "fail",
      message: "Failed to fetch checkout data",
    });
  } finally {
    client.release();
  }
};

const applyCoupon = async (userId, restaurantId, couponCode, totalAmount) => {
  try {
    console.log(userId, restaurantId, couponCode, totalAmount);
    // Fetch the coupon from DB
    const couponQuery = `
            SELECT * FROM coupons 
            WHERE coupon_code = $1 AND restaurant_id = $2 AND status = true AND (valid_till IS NULL OR valid_till >= CURRENT_DATE)
        `;
    const couponResult = await pool.query(couponQuery, [
      couponCode,
      restaurantId,
    ]);

    if (couponResult.rows.length === 0) {
      return { success: false, message: "Invalid or expired coupon" };
    }

    const coupon = couponResult.rows[0];

    // Check if the order meets the minimum order amount requirement
    if (totalAmount < coupon.min_order_amount) {
      return {
        success: false,
        message: `Order must be at least ${coupon.min_order_amount} to apply this coupon`,
      };
    }

    // Check user redemption history for the coupon
    const redemptionQuery = `
            SELECT redemption_count FROM coupon_redemptions 
            WHERE user_id = $1 AND coupon_id = $2
        `;
    const redemptionResult = await pool.query(redemptionQuery, [
      userId,
      coupon.id,
    ]);

    if (redemptionResult.rows.length > 0) {
      const redemptionCount = redemptionResult.rows[0].redemption_count;
      if (redemptionCount >= 1) {
        return { success: false, message: "You have already used this coupon" };
      }
    }

    // Calculate the discount amount
    let discountAmount = (totalAmount * coupon.discount_percentage) / 100;
    if (
      coupon.max_discount_amount !== null &&
      discountAmount > coupon.max_discount_amount
    ) {
      discountAmount = coupon.max_discount_amount;
    }

    return {
      success: true,
      discountAmount,
      coupon,
      message: `Coupon applied successfully. Discount: ${discountAmount}`,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to apply coupon" };
  }
};

// Update order status
const updateOrderStatus = async (order_id, data) => {
  const { status, delivery_status, refund_status } = data;

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

  if (result.rows.length === 0) {
    return res.status(404).json({
      code: 404,
      status: "fail",
      message: "Order not found",
    });
  }
};

// assign order to delivery partner
const assignOrderToDeliveryPartner = async (orderId, deliveryPartnerId) => {
  // Assign the delivery partner to the order
  const query = `
            UPDATE orders
            SET delivery_partner_id = $1, delivery_status = 'accepted', updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND delivery_status = 'pending'
            RETURNING *;
        `;
  const result = await pool.query(query, [deliveryPartnerId, orderId]);
};

// Helper function to calculate delivery fee
async function calculateDeliveryFee(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371; // Radius in km
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;

  return await getDeliveryFee(distance);
}

const getDeliveryFee = async (distance) => {
  try {
    const query = `SELECT minimum_km, fixed_fee, per_km_price FROM delivery_fee_config LIMIT 1`;
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      throw new Error("Delivery fee configuration not found");
    }

    const { minimum_km, fixed_fee, per_km_price } = result.rows[0];

    if (distance <= minimum_km) {
      return parseFloat(fixed_fee);
    }

    // Calculate additional fee based on distance beyond the minimum
    const extraKm = distance - minimum_km;
    const additionalFee = parseFloat(extraKm) * parseFloat(per_km_price);
    return parseFloat(
      (parseFloat(fixed_fee) + parseFloat(additionalFee)).toFixed(2)
    );
  } catch (error) {
    console.error("Error calculating delivery fee:", error);
    return 0; // Default to zero if there's an issue
  }
};

const orderDelivered = async (req, res) => {
  try {
    const { order_id, delivery_partner_id, otp } = req.body;
    if (!order_id || !delivery_partner_id || !otp) {
      return res.status(400).json({
        message: "something went wrong",
        status: "fail",
        code: 201,
        data: null,
      });
    }

    const orderQuery = `SELECT delivery_status , random_string FROM  orders WHERE id = $1 AND delivery_partner_id = $2`;

    const orderResult = await pool.query(orderQuery, [
      order_id,
      delivery_partner_id,
    ]);

    if (orderResult.rows.length === 0) {
      return res.status(400).json({
        message: "order not found",
        status: "fail",
        code: 201,
        data: null,
      });
    }
    const order = orderResult.rows[0];

    if (order.delivery_status === "delivered") {
      return res.status(400).json({
        message: "order already delivered",
        status: "fail",
        code: 201,
        data: null,
      });
    }

    if (order.random_string !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
        status: "fail",
        code: 201,
        data: null,
      });
    }

    const updateQuery = `UPDATE orders SET delivery_status='delivered', status='completed',    updated_at=CURRENT_TIMESTAMP WHERE id=$1  RETURNING *`;

    const updatedResult = await pool.query(updateQuery, [order_id]);
    const updatedOrder = updatedResult.rows[0];

    let user_id = updatedOrder.user_id;
    const io = getIO();

     
     io.to(`user_${updatedOrder.user_id}`).emit("order_status", {
          message: "Your order has been delivered successfully",
          order: updatedOrder,
        });

    return res.status(200).json({
      message: "Order delivered successfully",
      status: "success",
      code: 200,
    });
  } catch (error) {
    console.error("Error while :", error);
    return 0;
  }
};

module.exports = {
  getAllOrders,
  getUserOrders,
  getPartnerOrders,
  getOrderById,
  placeOrder,
  checkoutOrder,
  updateOrderStatus,
  assignOrderToDeliveryPartner,
  orderDelivered,
};
