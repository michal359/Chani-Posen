const express = require("express");
const router = express.Router();
const controller = require('../controllers/loginController.js');
const jwt = require('jsonwebtoken');

router.post("/", async (req, res) => {
    try {
        console.log("Received POST request to /login with body:", req.body); // Debug input
        const result = await controller.postLogin(req.body);
        console.log("Result from postLogin controller:", result); // Debug controller result

        if (result.success) {
            const { user } = result;
            const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET;

            console.log("Generating JWT token..."); // Debug token generation
            const token = jwt.sign({ user_id: user.user_id, role_id: user.role_id }, JWT_SECRET, { expiresIn: '1h' });

            console.log("Saving session data..."); // Debug session saving
            req.session.jwt = token;
            req.session.user = user;

            req.session.save((err) => {
                if (err) {
                    console.error("Error saving session:", err); // Debug session save error
                    res.status(500).send({ message: 'Internal server error' });
                } else {
                    res.status(200).send({ message: 'Logged in', user, token });
                }
            });
        } else {
            console.log("Invalid credentials"); // Debug invalid credentials
            res.status(401).send({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error("Error in /login POST route:", err.message); // Debug unexpected error
        res.status(500).send({ message: err.message, ok: false });
    }
});


router.get("/:username", async (req, res) => {
    const username = req.params.username;
    try {
        const result = await controller.getSalt(username);
        res.send(result);
    } catch (err) {
        res.status(404).send({ ok: false, error: err.message });
    }
});

module.exports = router;
