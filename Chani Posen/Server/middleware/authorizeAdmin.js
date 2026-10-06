const authenticateSession = require('./authenticateSession');

const authorizeAdmin = (req, res, next) => {
    console.log('in authorizeAdmin');

    authenticateSession(req, res, () => {
        const user = req.user;

        if (user && user.role_id === 1) {
            next();
        } else {
            res.status(403).send({
                ok: false,
                message: "User does not have Admin permissions.",
                res: "You don't have the permission. What are you doing here 😈"
            });
        }
    });
};

module.exports = authorizeAdmin;
