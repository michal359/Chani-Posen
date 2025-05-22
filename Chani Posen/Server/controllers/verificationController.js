const model = require('../model/verificationModel');
const crypto = require('crypto');
const e = require('express');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
require('dotenv').config();

async function verifyToken(token) {
    try {
        return model.verifyToken(token);
    } catch (err) {
        throw err;
    }
};

async function setPassword(body) {
    try {
        const { user_id, password, token_id } = body;

        // 1. יצירת salt והצפנה
        const salt = crypto.randomBytes(16).toString('hex');
        const saltedPassword = password + salt;
        const hashedPassword = crypto.createHash('sha256').update(saltedPassword).digest('hex');

        // 2. שמירת הסיסמה במסד
        await model.setPassword(user_id, hashedPassword, salt);

        // 3. סימון is_verified
        await model.verifyUser(user_id);

        // 4. שליפת פרטי המשתמש
        const { email, username, first_name } = await model.getUserInfo(user_id);

        // 5. שליחת מייל התחברות
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'החשבון שלך אומת בהצלחה',
            html: `
                <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
                    <h2>שלום ${first_name},</h2>
                    <p>החשבון שלך אומת בהצלחה!</p>
                    <p>ניתן להתחבר כעת למערכת באמצעות שם המשתמש שלך:</p>
                    <p><strong>${username}</strong></p>
                    <p>קישור לדף ההתחברות: <a href="http://localhost:5173/login">התחברות למערכת</a></p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        await model.deleteToken(token_id);

        return { success: true, message: "הסיסמה נשמרה והחשבון אומת. נשלח מייל התחברות." };

    } catch (err) {
        console.error("שגיאה ב־setPassword:", err);
        throw err;
    }
}

async function resendVerification(body) {
    try {
        const { user_id } = body;

        // 1. מחיקת טוקנים ישנים של המשתמש
        await model.deleteTokensByUserId(user_id);

        // 2. יצירת טוקן חדש
        const token_id = uuidv4();
        const expires_at = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // תקף ליומיים

        // 3. שמירת הטוקן החדש במסד
        await model.saveToken(user_id, token_id, expires_at);

        // 4. שליפת מייל ופרטים נוספים
        const { email, first_name } = await model.getUserInfo(user_id);

        // 5. שליחת מייל עם קישור חדש לאימות
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'קישור חדש לאימות חשבונך',
            html: `
          <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
            <h2>שלום ${first_name},</h2>
            <p>יצרנו עבורך קישור חדש לאימות חשבונך. הקישור תקף ליומיים.</p>
            <p><a href="http://localhost:5173/verify-account/${token_id}">לאמת את החשבון</a></p>
          </div>
        `
        };

        await transporter.sendMail(mailOptions);

        return { success: true, message: "נשלח קישור חדש לאימות למייל שלך." };

    } catch (err) {
        console.error("שגיאה ב-resendVerification:", err);
        return { success: false, message: "שגיאה בשליחת קישור חדש." };
    }
}

module.exports = { verifyToken, setPassword, resendVerification }
