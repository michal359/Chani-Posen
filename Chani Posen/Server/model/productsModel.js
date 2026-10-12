
const pool = require('../DB.js');

// --------------------------------------------------
// 1. Get all products
// --------------------------------------------------
async function getProducts() {
    try {
        const query = `
            SELECT
                p.product_id,
                p.product_name,
                p.product_price,
                p.product_description,
                p.purchase_count,
                (
                    SELECT MIN(i.image_path)
                    FROM images i
                    WHERE i.product_id = p.product_id
                      AND i.image_type = 'product'
                ) AS image_path
            FROM products p
            ORDER BY
                COALESCE(p.purchase_count, 0) DESC,
                p.product_name ASC
        `;

        const [rows] = await pool.execute(query);

        return {
            success: true,
            message: "Successfully retrieved products",
            products: rows
        };

    } catch (err) {
        console.error('Error getting products:', err);

        return {
            success: false,
            message: err.message
        };
    }
}

// --------------------------------------------------
// 2. Get product by ID
// --------------------------------------------------
async function getProductById(id) {
    try {
        const query = `
            SELECT
                p.product_id,
                p.product_name,
                p.product_description,
                p.purchase_count,
                p.product_price,
                i.image_path
            FROM products p
            LEFT JOIN images i
                ON p.product_id = i.product_id
                AND i.image_type = 'product'
            WHERE p.product_id = ?
        `;

        const [rows] = await pool.execute(query, [id]);

        return {
            success: true,
            message: "Successfully retrieved product",
            product: rows
        };

    } catch (err) {
        console.error('Error getting product:', err);

        return {
            success: false,
            message: err.message
        };
    }
}

// --------------------------------------------------
// 3. Add product
// --------------------------------------------------
async function addProduct(body) {
    try {
        const {
            product_name,
            product_description,
            product_price
        } = body;

        const query = `
            INSERT INTO products (
                product_name,
                product_description,
                product_price
            )
            VALUES (?, ?, ?)
        `;

        const [result] = await pool.execute(query, [
            product_name,
            product_description ?? null,
            product_price
        ]);

        return {
            success: true,
            message: "Successfully added product",
            product_id: result.insertId
        };

    } catch (err) {
        console.error('Error adding product:', err);

        return {
            success: false,
            message: err.message
        };
    }
}

// --------------------------------------------------
// 4. Delete product
// --------------------------------------------------
async function deleteProduct(id) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Lock the product before deletion.
        const [products] = await connection.execute(
            `SELECT product_id
             FROM products
             WHERE product_id = ?
             FOR UPDATE`,
            [id]
        );

        if (products.length === 0) {
            throw new Error("Product not found");
        }

        // Preserve purchase and financial history.
        const [[history]] = await connection.execute(
            `SELECT COUNT(*) AS total
             FROM purchases
             WHERE product_id = ?`,
            [id]
        );

        if (Number(history.total) > 0) {
            throw new Error(
                "Cannot delete a product with purchase history"
            );
        }

        // Remove dependent records only when there
        // is no purchase history.
        await connection.execute(
            `DELETE FROM images
             WHERE product_id = ?`,
            [id]
        );

        await connection.execute(
            `DELETE FROM recommendations
             WHERE product_id = ?`,
            [id]
        );

        await connection.execute(
            `DELETE FROM products
             WHERE product_id = ?`,
            [id]
        );

        await connection.commit();

        return {
            success: true,
            message: "Product deleted successfully"
        };

    } catch (err) {
        await connection.rollback();

        console.error('Error deleting product:', err);

        return {
            success: false,
            message: err.message
        };

    } finally {
        connection.release();
    }
}

// --------------------------------------------------
// 5. Update product
// --------------------------------------------------
async function updateProduct(body, id) {
    try {
        const {
            product_name,
            product_description,
            product_price
        } = body;

        const query = `
            UPDATE products
            SET
                product_name = ?,
                product_description = ?,
                product_price = ?
            WHERE product_id = ?
        `;

        const [result] = await pool.execute(query, [
            product_name,
            product_description ?? null,
            product_price,
            id
        ]);

        if (result.affectedRows === 0) {
            return {
                success: false,
                message: "Product not found"
            };
        }

        return {
            success: true,
            message: `Product ${id} updated successfully`
        };

    } catch (err) {
        console.error('Error updating product:', err);

        return {
            success: false,
            message: err.message
        };
    }
}

// --------------------------------------------------
// 6. Count products
// --------------------------------------------------
async function getProductsCount() {
    try {
        const [result] = await pool.execute(
            `SELECT COUNT(*) AS total
             FROM products`
        );

        return result[0].total;

    } catch (err) {
        console.error('Error counting products:', err);
        throw err;
    }
}

module.exports = {
    getProducts,
    getProductById,
    addProduct,
    deleteProduct,
    updateProduct,
    getProductsCount
};
