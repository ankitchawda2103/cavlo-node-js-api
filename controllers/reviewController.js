const { pool } = require('../config/db'); // Assuming pool is set up for PostgreSQL

// Get restaurant review
const getReviewsByRestaurant = async (req, res) => {
    try {
        const { restaurant_id } = req.body;

        if (!restaurant_id) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'Restaurant ID is required',
            });
        }

        // Fetch aggregate review data
        const aggregateQuery = `
            SELECT 
                COALESCE(COUNT(*), 0) AS total_reviews,
                COALESCE(ROUND(AVG(star_rating), 1), 0.0) AS average_rating,
                COALESCE(SUM(CASE WHEN star_rating = 5 THEN 1 ELSE 0 END), 0) AS five_stars,
                COALESCE(SUM(CASE WHEN star_rating = 4 THEN 1 ELSE 0 END), 0) AS four_stars,
                COALESCE(SUM(CASE WHEN star_rating = 3 THEN 1 ELSE 0 END), 0) AS three_stars,
                COALESCE(SUM(CASE WHEN star_rating = 2 THEN 1 ELSE 0 END), 0) AS two_stars,
                COALESCE(SUM(CASE WHEN star_rating = 1 THEN 1 ELSE 0 END), 0) AS one_stars
            FROM restaurant_reviews
            WHERE restaurant_id = $1;
        `;
        const aggregateValues = [restaurant_id];
        const aggregateResult = await pool.query(aggregateQuery, aggregateValues);

        // Fetch individual reviews with user details
        const reviewsQuery = `
            SELECT 
                rr.user_id, rr.star_rating, rr.review_text, rr.created_at,
                u.name AS user_name, u.email AS user_email, u.profile_image
            FROM restaurant_reviews rr
            INNER JOIN users u ON rr.user_id = u.id
            WHERE rr.restaurant_id = $1
            ORDER BY rr.created_at DESC;
        `;
        const reviewsResult = await pool.query(reviewsQuery, aggregateValues);

        const aggregateData = aggregateResult.rows[0];

        // Construct the response
        res.status(200).json({
            code: 200,
            status: 'success',
            data: {
                restaurant_id: parseInt(restaurant_id),
                average_rating: parseFloat(aggregateData.average_rating),
                total_reviews: parseInt(aggregateData.total_reviews),
                breakdown: {
                    five_stars: parseInt(aggregateData.five_stars),
                    four_stars: parseInt(aggregateData.four_stars),
                    three_stars: parseInt(aggregateData.three_stars),
                    two_stars: parseInt(aggregateData.two_stars),
                    one_stars: parseInt(aggregateData.one_stars),
                },
                reviews: reviewsResult.rows,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to fetch reviews for the restaurant',
        });
    }
};


// Add review
const addReview = async (req, res) => {
    try {
        const user_id = req.user.id;
        const { restaurant_id, star_rating, review_text } = req.body;
        console.log("dfshkfjadshfkjhfdsa",user_id,req.body);

        console.log("dsfkjasbdjkfadsjk",restaurant_id, star_rating, review_text);

        if (!user_id || !restaurant_id || !star_rating) {
            return res.status(400).json({
                code: 400,
                status: 'fail',
                message: 'User id, restaurant id, and star_rating are required',
            });
        }

        if (star_rating < 1 || star_rating > 5) {
            return res.status(400).json({ 
                code: 400, 
                status: 'fail', 
                message: 'star_rating must be between 1 and 5' 
            });
        }

        // Check if a review already exists for this user and restaurant
        const checkQuery = `
            SELECT * 
            FROM restaurant_reviews 
            WHERE user_id = $1 AND restaurant_id = $2;
        `;
        const checkValues = [user_id, restaurant_id];
        const checkResult = await pool.query(checkQuery, checkValues);

        if (checkResult.rows.length > 0) {
            // If a review exists, update it
            const updateQuery = `
                UPDATE restaurant_reviews
                SET star_rating = $1, review_text = $2, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $3 AND restaurant_id = $4
                RETURNING *;
            `;
            const updateValues = [star_rating, review_text, user_id, restaurant_id];
            const updateResult = await pool.query(updateQuery, updateValues);

            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'Review updated successfully',
                data: updateResult.rows[0],
            });
        } else {
            // If no review exists, insert a new one
            const insertQuery = `
                INSERT INTO restaurant_reviews (user_id, restaurant_id, star_rating, review_text)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;
            const insertValues = [user_id, restaurant_id, star_rating, review_text];
            const insertResult = await pool.query(insertQuery, insertValues);

            return res.status(200).json({
                code: 200,
                status: 'success',
                message: 'Review added successfully',
                data: insertResult.rows[0],
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'An error occurred while adding/updating the review',
        });
    }
};

// Delete restaurant review
const deleteReview = async (req, res) => {
    try {
    
        const { id } = req.params;
        const query = `DELETE FROM restaurant_reviews WHERE id = $1 RETURNING *;`;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(400).json({ code: 400, status: 'fail', error: 'Review not found' });
        }

        return res.status(200).json({ code: 200, status: 'success', message: 'Review deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            code: 500,
            status: 'fail',
            message: 'Failed to fetch discounted restaurants',
        });
    }
};

module.exports = {
    getReviewsByRestaurant,
    addReview,
    deleteReview
};
