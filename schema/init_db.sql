-- Create the "users" table to store user details
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(15) UNIQUE,
  name VARCHAR(255),
  nick_name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  via VARCHAR(255) DEFAULT 'number',
  dob DATE,
  gender VARCHAR(10),
  profile_image VARCHAR(255),
  is_profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the "otps" table to store OTPs sent to users without foreign key
CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '10 minutes'
);


-- Add index on phone_number for faster lookups in both tables
CREATE INDEX IF NOT EXISTS idx_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_phone_number ON otps(phone_number);

-- Create a sequence for generating OTPs if needed (optional)
CREATE SEQUENCE IF NOT EXISTS otp_seq;

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(255),  -- URL or file path for the category image
    status BOOLEAN DEFAULT TRUE,  -- Active status (true or false)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    apartment_number VARCHAR(50),
    street_name VARCHAR(255) NOT NULL,
    postal_code VARCHAR(20),
    address_type VARCHAR(50) CHECK (address_type IN ('home', 'work', 'family', 'friend','other')) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    lat DECIMAL(9, 6), -- Latitude for geolocation
    lng DECIMAL(9, 6), -- Longitude for geolocation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a "roles" table to store user roles (super_admin, admin, restaurant_owner, etc.)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,  -- e.g., 'super_admin', 'admin', 'restaurant_owner', 'staff'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the "admins" table to store admin users
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  phone_number VARCHAR(15) UNIQUE,
  email VARCHAR(255) UNIQUE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  status BOOLEAN DEFAULT TRUE,  -- Active status (true or false)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the "restaurants" table to store restaurant details
CREATE TABLE IF NOT EXISTS restaurants (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    lat DECIMAL(9, 6), -- Latitude for geolocation
    lng DECIMAL(9, 6), -- Longitude for geolocation
    phone_number VARCHAR(20),
    email VARCHAR(60),
    logo VARCHAR(255),
    status BOOLEAN DEFAULT TRUE,  -- Active status (true or false)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE, -- Reference to the restaurant
    name VARCHAR(255) NOT NULL, -- Name of the item
    description TEXT, -- Description of the item
    price DECIMAL(10, 2) NOT NULL, -- Price of the item
    category_id INT REFERENCES categories(id) ON DELETE SET NULL, -- Optional category
    image VARCHAR(255), -- URL or file path for the item image
    is_vegetarian BOOLEAN DEFAULT FALSE, -- Whether the item is vegetarian
    is_available BOOLEAN DEFAULT TRUE, -- Availability status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by restaurant_id
CREATE INDEX IF NOT EXISTS idx_restaurant_id ON menu_items(restaurant_id);
-- Index for faster lookups by category_id
CREATE INDEX IF NOT EXISTS idx_category_id ON menu_items(category_id);

CREATE TABLE IF NOT EXISTS restaurant_wishlists (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, restaurant_id) -- Ensure no duplicate entries for the same user and restaurant
);
CREATE INDEX IF NOT EXISTS idx_user_id ON restaurant_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurant ON restaurant_wishlists(user_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_id ON restaurant_wishlists(restaurant_id);
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    description TEXT,
    coupon_code VARCHAR(255),
    image VARCHAR(255),
    discount_percentage DECIMAL(5, 2) NOT NULL, -- Store discount as a percentage (max 100%)
    max_discount_amount DECIMAL(10, 2) DEFAULT NULL, -- Maximum discount amount allowed
    min_order_amount DECIMAL(10, 2) DEFAULT 0, -- Minimum order amount required for the coupon
    per_user_usage_limit INT DEFAULT 0,
    status BOOLEAN DEFAULT true, -- To enable/disable the coupon
    is_special BOOLEAN DEFAULT false, -- To mark special promotions
    valid_till DATE, -- Coupon expiration date
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id INT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    redemption_count INT DEFAULT 1,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Create an index on the "restaurant_id" column for faster lookups by restaurant
CREATE INDEX IF NOT EXISTS idx_coupons_restaurant_id ON coupons(restaurant_id);
-- Create an index on the "coupon_code" column for efficient search by coupon code
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(coupon_code);
-- Optional: Create an index on "valid_till" to speed up filtering based on expiration
CREATE INDEX IF NOT EXISTS idx_coupons_valid_till ON coupons(valid_till);


-- Create the "restaurant_reviews" table to store user reviews of restaurants
CREATE TABLE IF NOT EXISTS restaurant_reviews (
    id SERIAL PRIMARY KEY, -- Unique identifier for each review
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Reference to the user who wrote the review
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE, -- Reference to the restaurant being reviewed
    star_rating INT CHECK (star_rating BETWEEN 1 AND 5) NOT NULL, -- Star rating (1 to 5)
    review_text TEXT, -- Review description text
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the review was created
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- When the review was last updated
);

-- Create an index for faster lookups by user_id and restaurant_id
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON restaurant_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON restaurant_reviews(restaurant_id);


CREATE TABLE IF NOT EXISTS  cart (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id INT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    random_string VARCHAR(10),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'paypal')),
    delivery_address TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    delivery_status VARCHAR(50) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'accepted', 'preparing', 'out for delivery', 'delivered', 'cancelled')),
    refund_status VARCHAR(50) DEFAULT 'not_requested' CHECK (refund_status IN ('not_requested', 'requested', 'processed', 'rejected')),
    delivery_partner_id INT REFERENCES delivery_partners(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS delivery_partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    vehicle_details JSONB, -- Optional vehicle details (e.g., type, number, etc.)
    profile_image VARCHAR(255), -- URL for profile image
    status BOOLEAN DEFAULT TRUE, -- Active or inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE users
ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) NOT NULL;


ALTER TABLE delivery_partners
ADD COLUMN IF NOT EXISTS lat DECIMAL(9, 6) NULL,
ADD COLUMN IF NOT EXISTS lng DECIMAL(9, 6) NULL,
ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS delivery_fee_config (
  id SERIAL PRIMARY KEY,
  minimum_km FLOAT NOT NULL,
  fixed_fee NUMERIC(10, 2) NOT NULL,
  per_km_price NUMERIC(10, 2) NOT NULL
);


CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(255) NOT NULL UNIQUE,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
    status VARCHAR(50) NOT NULL,
    payment_date TIMESTAMP DEFAULT NOW(),
    additional_data JSONB
);
