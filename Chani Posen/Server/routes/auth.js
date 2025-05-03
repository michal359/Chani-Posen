const express = require('express');
const router = express.Router();
const db = require('../DB');

router.post('/check-username', async (req, res) => {
    const { username } = req.body;

    try {
        const [result] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (result.length > 0) {
            return res.status(400).json({ message: 'שם משתמש כבר תפוס' });
        }
        return res.status(200).json({ message: 'שם משתמש זמין' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'שגיאה בבדיקת שם משתמש' });
    }
});

module.exports = router;
