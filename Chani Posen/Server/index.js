const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const app = express();
app.use(express.json());
app.use(cookieParser()); 

const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');

app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

const PORT = process.env.PORT || 3000;

const usersRouter = require('./routes/usersRouter');
app.use("/users", usersRouter);

const adminRouter = require('./routes/adminRouter');
app.use("/admin", adminRouter);

const clientsRouter = require('./routes/clientsRouter');
app.use("/clients", clientsRouter);

const treatmentsRouter = require('./routes/treatmentsRouter');
app.use("/treatments", treatmentsRouter);

const treatmentTypesRouter = require("./routes/treatmentTypesRouter");
app.use("/treatment-types", treatmentTypesRouter);

const productsRouter = require('./routes/productsRouter');
app.use("/products", productsRouter);

const purchasesRouter = require('./routes/purchasesRouter');
app.use("/purchases", purchasesRouter);

const loginRouter = require("./routes/loginRouter");
app.use("/login", loginRouter);

const uploadsRouter = require('./routes/uploadsRouter');
app.use("/uploads", uploadsRouter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log("Serving static files from:", path.join(__dirname, 'uploads'));

const recommendationsRouter = require('./routes/recommendationsRouter');
app.use("/recommendations", recommendationsRouter);

const imagesRouter = require('./routes/imagesRouter');
app.use("/images", imagesRouter);

const notificationsRouter = require('./routes/notificationsRouter');
app.use("/notifications", notificationsRouter);

const aiRouter = require('./routes/aiRouter');
app.use("/ai", aiRouter);


// ראוטרים שאני אצטרך בעתיד

const logoutRouter = require("./routes/logoutRouter");
app.use("/logout", logoutRouter);

const signupRouter = require("./routes/signupRouter");
app.use("/signup", signupRouter);



app.listen(PORT, () => {
  console.log(`SERVER: http://localhost:${PORT}`);
});
