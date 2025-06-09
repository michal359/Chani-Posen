const model = require('../model/clientsModel');
const crypto = require('crypto');
require('dotenv').config();
const { transliterate } = require('transliteration');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// פונקציה שיוצרת טוקן עם טוקף של יומיים
function generateToken() {
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); 
    return { tokenId, expiresAt };
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

function generateUsername(firstName, lastName, userId) {
    if (!firstName || !lastName || !userId) {
        throw new Error("Missing required parameters");
    }
    const englishFirstName = transliterate(firstName).replace(/[^a-zA-Z]/g, "");
    const englishLastName = transliterate(lastName).replace(/[^a-zA-Z]/g, "");
    return `${englishFirstName}${englishLastName}${userId}`;
}

async function getAllClients(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const data = await model.getAllClients(page, limit);
        res.send(data);
    } catch (err) {
        console.error("Error in getAllClients:", err);
        res.status(500).send({ success: false, message: err.message });
    }
}

async function searchClientsByName(req, res) {
    try {
        const searchTerm = req.query.search;

        if (!searchTerm || searchTerm.trim() === "") {
            return res.status(400).send({ success: false, message: "Missing search term" });
        }

        const data = await model.searchClientsByName(searchTerm);
        res.send(data);
    } catch (err) {
        console.error("Error in searchClientsByName:", err);
        res.status(500).send({ success: false, message: err.message });
    }
}

async function filterClients(req, res) {
    try {
        const { status, skin, birthMonth } = req.query;
        const data = await model.filterClients({ status, skin, birthMonth });
        res.send(data);
    } catch (err) {
        console.error("Error in filterClients:", err);
        res.status(500).send({ success: false, message: err.message });
    }
}

async function getClient(id) {
    try {
        return model.getClient(id);
    } catch (err) {
        throw err;
    }
};

async function getUniqueUsername(query) {
    try {
        console.log('check cont, data: ', query)
        return model.getUniqueUsername(query);
    } catch (err) {
        throw err;
    }
}

async function updateClient(body, id) {
    try {
        return await model.updateClient(body, id);
    } catch (err) {
        throw err;
    }
}

async function createNewClient(body) {
    try {
        // const password = generatePassword();
        // const salt = crypto.randomBytes(16).toString('hex');
        // const saltedPassword = password + salt;
        // const hashedPassword = crypto.createHash('sha256').update(saltedPassword).digest('hex');

        const result = await model.createNewClient(body);
        if (result.ok) {
            const userId = result.userId;
            const username = generateUsername(body.first_name, body.last_name, userId);
            await model.updateUsername(userId, username);

            const { tokenId, expiresAt } = generateToken();
            await model.insertPasswordResetToken(tokenId, userId, expiresAt); // פונקציה חדשה במודל

            // 4. שלח מייל עם קישור לטוקן
            const verificationUrl = `http://localhost:5173/verify-account/${tokenId}`;
            await sendVerificationEmail(body.email, body.first_name, verificationUrl);

            // 5. הודעה למערכת על לקוח חדש
            await notifyClinicOfNewClient(body.email, body, username);

            return { ...result, username };
        }
    } catch (err) {
        throw err;
    }

}

async function getClientsByProductId(productId) {
    try {
        return model.getClientsByProductId(productId);
    } catch (err) {
        throw err;
    }
};

async function deleteClient(id) {
    try {
        return model.deleteClient(id);
    } catch (err) {
        throw err;
    }
};

async function getClientsCount() {
    try {
        return model.getClientsCount();
    }
    catch (err) {
        throw err;
    }
}

async function sendVerificationEmail(clientEmail, clientName, verificationUrl) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: clientEmail,
        subject: 'אימות חשבון למערכת הקליניקה',
        html: `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
                <h2>שלום ${clientName},</h2>
                <p>הצטרפת למערכת הקליניקה – אנא אשרי את חשבונך על ידי לחיצה על הקישור הבא:</p>
                <p><a href="${verificationUrl}">אימות חשבון והגדרת סיסמה</a></p>
                <br>
                <p style="color: gray;">אם לא את יצרת את החשבון, ניתן להתעלם מהמייל.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("📤 מייל אימות נשלח:", info.response);
    } catch (error) {
        console.error("❌ שגיאה בשליחת מייל אימות:", error);
    }
}



async function notifyClinicOfNewClient(clientEmail, clientDetails, username) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `לקוח חדש נרשם: ${clientDetails.first_name} ${clientDetails.last_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
                <h3>פרטי לקוח חדש:</h3>
                <ul>
                    <li>שם: ${clientDetails.first_name} ${clientDetails.last_name}</li>
                    <li>אימייל: ${clientEmail}</li>
                    <li>טלפון: ${clientDetails.phone || 'לא נמסר'}</li>
                    <li>שם משתמש: ${username}</li>
                </ul>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}


module.exports = { getAllClients, searchClientsByName, filterClients, getClientsCount, getClient, updateClient, getUniqueUsername, createNewClient, getClientsByProductId, deleteClient };
