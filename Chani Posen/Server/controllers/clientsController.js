const model = require('../model/clientsModel');
const crypto = require('crypto');
require('dotenv').config();
const { transliterate } = require('transliteration');
const nodemailer = require('nodemailer');

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


const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

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
        const password = generatePassword();
        const salt = crypto.randomBytes(16).toString('hex');
        const saltedPassword = password + salt;
        const hashedPassword = crypto.createHash('sha256').update(saltedPassword).digest('hex');

        const result = await model.createNewClient(body, hashedPassword, salt);
        if (result.ok) {
            const username = generateUsername(body.first_name, body.last_name, result.userId);
            await model.updateUsername(result.userId, username);
            console.log('Email being sent to client:', body.email);

             // שולחת מייל ללקוח
             try {
                console.log("Sending email to client...");
                await sendAccountDetailsToClient(body.email, body.first_name, username, password);
            } catch (err) {
                console.error("Failed to send email to client:", err);
            }
            

             // שולחת מייל למערכת
             await notifyClinicOfNewClient(body.email, body, username, password);
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

async function sendAccountDetailsToClient(clientEmail, clientName, username, password) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: clientEmail,
        subject: 'התחברות למערכת הקליניקה',
        html: `
            <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
                <h2>היי ${clientName},</h2>
                <p>ברוכה הבאה למערכת הקליניקה!</p>
                <p>שם המשתמש שלך: <strong>${username}</strong></p>
                <p>הסיסמה שלך: <strong>${password}</strong></p>
                <p>התחברי למערכת כאן: <a href="http://localhost:5173/">כניסה למערכת</a></p>
                <br>
                <p style="color: gray;">אם לא את יצרת את החשבון הזה, אנא התעלמי מהמייל.</p>
            </div>
        `
    };
    // const mailOptions = {
    //     from: process.env.EMAIL_USER,
    //     to: clientEmail,
    //     subject: 'בדיקת שליחה פשוטה',
    //     text: 'היי, זהו מייל בדיקה פשוט ביותר. רואים אותי?',
    //   };
      
      

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("📤 מייל נשלח ללקוחה:", info.response);
    } catch (error) {
        console.error("❌ שגיאה בשליחת מייל ללקוחה:", error);
    }
}


async function notifyClinicOfNewClient(clientEmail, clientDetails, username, password) {
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
                    <li>סיסמה: ${password}</li>
                </ul>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}


module.exports = { getAllClients, getClientsCount, getClient, updateClient, getUniqueUsername, createNewClient, getClientsByProductId, deleteClient };
