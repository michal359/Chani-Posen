const pool = require('../DB.js');

async function getProducts() {
    try {
        const query = `
        SELECT p.product_id, p.product_name, p.product_price, p.product_description, i.image_path
        FROM products p
        LEFT JOIN images i ON p.product_id = i.product_id AND i.image_type = 'product';
        `;
        const [rows] = await pool.execute(query);
        return { success: true, message: "Successfully retrieved products", products: rows };
    }
    catch (err) {
        console.error('Error getting products', err);
        return { success: false, message: err.message };
    }
};

async function getProductById(id) {
    try {
        const query = `
            SELECT p.product_id, p.product_name, p.product_description, p.purchase_count, p.product_price, i.image_path
            FROM products p 
            LEFT JOIN images i ON p.product_id = i.product_id AND i.image_type = 'product'
            WHERE p.product_id = ?;
        `;
        const [rows] = await pool.execute(query, [id]);

        return { success: true, message: "Successfully retrieved product", product: rows };
    }
    catch (err) {
        console.error('Error getting product with id:', id, err);
        return { success: false, message: err.message };
    }
};



async function addProduct(body) {
    try {
        const { product_name, product_description, product_price } = body;
        const productQuery = `
            INSERT INTO products (product_name, product_description, product_price)
            VALUES (?,?,?)
        `;
        const [productResult] = await pool.execute(productQuery, [product_name, product_description, product_price]);

        const productId = productResult.insertId;

        return { success: true, message: "Successfully added product", product_id: productId };
    }
    catch (err) {
        console.error('Error adding product', err);
        return { success: false, message: err.message };
    }
};

async function deleteProduct(id) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(`DELETE FROM images WHERE product_id = ?;`, [id]);

        await connection.query(`DELETE FROM purchases WHERE product_id = ?;`, [id]);

        await connection.query(`DELETE FROM recommendations WHERE product_id = ?;`, [id]);

        const [result] = await connection.query(`DELETE FROM products WHERE product_id = ?;`, [id]);

        if (result.affectedRows === 0) {
            throw new Error("Product not found");
        }

        await connection.commit();

        return { success: true, message: "Product deleted successfully" };
    } catch (err) {
        await connection.rollback();
        console.error("Error deleting product:", err);
        throw new Error(err.message);
    } finally {
        connection.release();
    }
}

async function updateProduct(body, id) {
    try {
        const product_id = id;
        const { product_name, product_description, product_price } = body;

        const productSql = `
            UPDATE products 
            SET product_name = ?, product_description = ?, product_price = ? 
            WHERE product_id = ?`;

        await pool.query(productSql, [product_name, product_description, product_price, product_id]);

        return {
            success: true,
            message: `Product ${product_id} updated successfully`,
        };

    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
}

async function getProductsCount() {
    try {
        const sql = `SELECT COUNT(*) AS total FROM products;`;
        const [result] = await pool.query(sql);
        return result[0].total;
    } catch (err) {
        console.error("Error:", err);
        throw new Error(err.message);
    }
}


module.exports = { getProducts, getProductById, addProduct, deleteProduct, updateProduct, getProductsCount };