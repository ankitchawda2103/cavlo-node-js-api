const { pool } = require('../config/db');  // Assuming you have a pool.js to configure your PostgreSQL client

// Get all categories
const getAllCategories = async (req, res) => {
    try {
        const { status } = req.body
        let result;
        if (status) {
            result = await pool.query('SELECT * FROM categories WHERE status = $1', [status]);
        } else {
            result = await pool.query('SELECT * FROM categories');
        }
        res.status(200).json({
            code: 200,
            status: "success",
            message: 'Categories fetched successfully',
            data: result.rows,
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ code: 500, status: "fail", message: 'Failed to fetch categories' });
    }
};

// Get a single category by ID
const getCategoryById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(400).json({code: 400, status: "fail", message: 'Category not found' });
        }

        res.status(200).json({
            code: 200, 
            status: "success",
            message: 'Category fetched successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({code: 500, status: "fail", message: 'Failed to fetch category' });
    }
};

// Create a new category
const createCategory = async (req, res) => {
    const { name, status } = req.body;
    const image = req.file ? req.file.location : null;  // Get the image URL from the uploaded file, if any

    if (!name) {
        return res.status(400).json({ code: 400, status: "fail", message: 'Category name is required' });
    }

    try {
        // Check if the category name already exists
        const existingCategory = await pool.query('SELECT * FROM categories WHERE name = $1', [name]);

        if (existingCategory.rows.length > 0) {
            return res.status(400).json({ code: 400, status: "fail", message: 'Category name already exists' });
        }

        // Insert the new category
        const result = await pool.query(
            'INSERT INTO categories (name, image, status) VALUES ($1, $2, $3) RETURNING *',
            [name, image, status]
        );

        res.status(200).json({
            code: 200,
            status: "success",
            message: 'Category created successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ code: 500, status: "fail", message: 'Failed to create category' });
    }
};


// Update an existing category
const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, status } = req.body;
    const image = req.file ? req.file.location : null;  // Get the image URL from the uploaded file, if any

    if (!name && !status && !image) {
        return res.status(400).json({code: 400, status: "fail", message: 'At least one field is required to update' });
    }

    try {
        // Check if the new category name already exists (excluding the current category being updated)
        if (name) {
            const existingCategory = await pool.query('SELECT * FROM categories WHERE name = $1 AND id != $2', [name, id]);
            if (existingCategory.rows.length > 0) {
                return res.status(400).json({code: 400, status: "fail", message: 'Category name already exists' });
            }
        }

        // Update the category
        const result = await pool.query(
            'UPDATE categories SET name = COALESCE($1, name), image = COALESCE($2, image), status = COALESCE($3, status), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [name, image, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({code: 400, status: "fail", message: 'Category not found' });
        }

        res.status(200).json({
            code: 200, status: "success",
            message: 'Category updated successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ code: 500, status: "fail",message: 'Failed to update category' });
    }
};


// Delete a category
const deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {

        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(400).json({code: 400, status: "fail", message: 'Category not found' });
        }

        res.status(200).json({
            code: 200, status: "success",
            message: 'Category deleted successfully',
            data: result.rows[0],
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({code: 500, status: "fail", message: 'Failed to delete category' });
    }
};



module.exports = {
    createCategory,
    updateCategory,
    deleteCategory,
    getAllCategories,
    getCategoryById,
};
