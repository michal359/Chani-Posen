DROP DATABASE IF EXISTS chani_posen_db;
CREATE DATABASE chani_posen_db;
USE chani_posen_db;

CREATE TABLE roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL
);

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role_id INT,
    is_verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (role_id) 
      REFERENCES roles (role_id) 
      ON UPDATE RESTRICT 
      ON DELETE CASCADE
);

CREATE TABLE clients (
    client_id INT PRIMARY KEY,
    treatment_status ENUM(
        'שלב 1 - איבחון', 
        'שלב 2 - אסטרטגיה', 
        'שלב 3 - טיפול בקליניקה', 
        'שלב 4 - התמדה ומעקב', 
        'עדיין לא פנתה לקבלת שירות'
    ),
    skin_type ENUM(
        'רגיל', 
        'יבש וחסר לחות', 
        'שמן', 
        'בעייתי', 
        'מעורב'
    ),
    FOREIGN KEY (client_id) REFERENCES users (user_id) 
        ON UPDATE RESTRICT 
        ON DELETE CASCADE
);


CREATE TABLE admins (
    admin_id INT PRIMARY KEY,
    professional_description VARCHAR(5000), 
    FOREIGN KEY (admin_id) REFERENCES users (user_id) 
        ON UPDATE RESTRICT 
        ON DELETE CASCADE
);

CREATE TABLE ai_conversations (
    conversation_id CHAR(36) PRIMARY KEY,
    admin_id INT NOT NULL,
    title VARCHAR(255) DEFAULT 'שיחה חדשה',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_id)
        REFERENCES admins(admin_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


CREATE TABLE ai_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id)
        REFERENCES ai_conversations(conversation_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    product_price DECIMAL(10,2) NOT NULL,
    purchase_count INT DEFAULT 0
);

CREATE TABLE recommendations (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY, 
    client_id INT NOT NULL,                           
    product_id INT NOT NULL,                          
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   
    FOREIGN KEY (client_id) REFERENCES users (user_id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (product_id) 
        ON UPDATE RESTRICT 
        ON DELETE CASCADE
);

CREATE TABLE purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    product_id INT NOT NULL,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    purchase_price DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (client_id)
        REFERENCES clients(client_id)
        ON DELETE CASCADE,
    FOREIGN KEY (product_id)
        REFERENCES products(product_id)
);

CREATE TABLE treatment_types (
    treatment_type_id INT AUTO_INCREMENT PRIMARY KEY,
    treatment_name VARCHAR(255) NOT NULL UNIQUE,
    default_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    default_duration INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE treatments (
    treatment_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    treatment_type_id INT NOT NULL,
    treatment_date DATETIME NOT NULL,
    duration INT NOT NULL,
    summary TEXT,
    treatment_price DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_special_price BOOLEAN NOT NULL DEFAULT FALSE,
    price_note VARCHAR(255),
    FOREIGN KEY (client_id)
        REFERENCES clients(client_id)
        ON DELETE CASCADE,
    FOREIGN KEY (treatment_type_id)
        REFERENCES treatment_types(treatment_type_id)
);

CREATE TABLE wallets (
    client_id INT PRIMARY KEY,
    credit_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (client_id)
        REFERENCES clients(client_id)
        ON DELETE CASCADE
);

CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_source ENUM(
        'DIRECT',
        'WALLET'
    ) NOT NULL,
    target_type ENUM(
        'TREATMENT',
        'PURCHASE',
        'WALLET_CREDIT'
    ) NOT NULL,
    treatment_id INT DEFAULT NULL,
    purchase_id INT DEFAULT NULL,
    amount_received DECIMAL(10,2)
        NOT NULL DEFAULT 0.00,
    amount_applied DECIMAL(10,2)
        NOT NULL DEFAULT 0.00,
    note VARCHAR(500),
    FOREIGN KEY (client_id)
        REFERENCES clients(client_id)
        ON DELETE CASCADE,
    FOREIGN KEY (treatment_id)
        REFERENCES treatments(treatment_id)
        ON DELETE CASCADE,
    FOREIGN KEY (purchase_id)
        REFERENCES purchases(purchase_id)
        ON DELETE CASCADE
);

CREATE TABLE images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,    
    user_id INT NOT NULL,
    product_id INT,                      
    image_type ENUM('profile', 'clinic', 'treatment', 'product', 'other') NOT NULL, 
    image_path VARCHAR(255) NOT NULL,           
    description VARCHAR(5000),                            
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    uploaded_by INT NOT NULL,                    
    FOREIGN KEY (user_id) REFERENCES users (user_id) 
        ON UPDATE CASCADE 
        ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users (user_id) 
        ON UPDATE RESTRICT 
        ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products (product_id)  
        ON UPDATE CASCADE
        ON DELETE CASCADE
);


CREATE TABLE passwords (
    user_id INT PRIMARY KEY,
    user_password VARCHAR(255),
    salt VARCHAR(255),
    FOREIGN KEY (user_id) 
      REFERENCES users (user_id) 
      ON UPDATE RESTRICT 
      ON DELETE CASCADE
);

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_text TEXT NOT NULL,
    notification_type ENUM('FINANCIAL', 'TREATMENT', 'PRODUCT', 'PERSONAL', 'SYSTEM', 'OTHER') NOT NULL,
    entity_type ENUM('TREATMENT', 'PURCHASE', 'RECOMMENDATION', 'IMAGE', 'COMMENT', 'NONE') DEFAULT 'NONE',
    entity_id INT DEFAULT NULL,
    link VARCHAR(255) DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    times_sent INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
    token_id CHAR(36) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


INSERT INTO roles (role_name) 
VALUES 
('Admin'),
('Client');

INSERT INTO users (username, first_name, last_name, email, phone, birth_date, role_id, is_verified) 
VALUES 
('michalAdmin1', 'מיכל', 'מנהל', 'michal0548429273@gmail.com', '0548429273', '2004-09-10', 1, TRUE),
('chaniAdmin2', 'חני', 'מנהל', 'michal0548429273@gmail.com', '0548475867', '2004-11-23', 1, TRUE),
('chaniClient3', 'חני', 'לקוח', 'michal0548429273@gmail.com', '0548475867', '2004-11-23', 2, TRUE),
('DanaCohen4', 'דנה', 'כהן', 'michal0548429273@gmail.com', '0548429273', '1990-12-15', 2, TRUE),
('SaraLevi5', 'שרה', 'לוי', 'michal0548429273@gmail.com', '0548429273', '1985-07-20', 2, TRUE),
('RachelMizrahi6', 'רחל', 'מזרחי', 'michal0548429273@gmail.com', '0548429273', '1992-12-12', 2, TRUE),
('ShiraBar7', 'שירה', 'בר', 'michal0548429273@gmail.com', '0548429273', '1988-08-03', 2, TRUE),
('TehilaOr8', 'תהילה', 'אור', 'michal0548429273@gmail.com', '0548429273', '1995-04-10', 2, TRUE);
    
INSERT INTO passwords (user_id, user_password, salt) 
VALUES 
(1, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(2, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(3, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(4, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(5, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(6, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(7, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(8, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15');

INSERT INTO clients (client_id, treatment_status, skin_type)
VALUES 
(3, 'שלב 1 - איבחון', 'יבש וחסר לחות'),
(4, 'שלב 1 - איבחון', 'יבש וחסר לחות'),
(5, 'שלב 2 - אסטרטגיה', 'שמן'),
(6, 'שלב 3 - טיפול בקליניקה', 'מעורב'),
(7, 'שלב 4 - התמדה ומעקב', 'רגיל'),
(8, 'עדיין לא פנתה לקבלת שירות', 'בעייתי');


INSERT INTO admins (admin_id, professional_description) 
VALUES 
(1, 'Michal is a certified professional with 10 years of experience in skincare and treatments. Specializes in personalized facial therapies and holistic skincare approaches.'),
(2, 'Chani is an experienced aesthetician who has worked with diverse clients. Her expertise includes advanced skin care treatments and personalized skincare routines for all skin types.');

INSERT INTO products (product_name, product_description, product_price) 
VALUES 
('קרם מולטי אקטיב', 'קרם פנים לחות לעור יבש.', 79.90),
('סרום ריסורפיסנג', 'מפחית קמטים ומצעיר את העור.', 120.50),
('קרם לחות גל', 'הגנה מהשמש לעור רגיש.', 45.00),
('פרופוליס', 'מתקן את העור בן לילה.', 95.00),
('סבון הבהרה', 'מכוון לנפיחות ועיגולים שחורים מתחת לעיניים.', 60.00);

INSERT INTO recommendations (client_id, product_id) 
VALUES 
(4, 1),
(5, 2),
(6, 3),
(7, 4),
(8, 5);

INSERT INTO purchases (client_id, product_id, purchase_price, purchase_date, amount_paid)
VALUES
(5, 2, 120.50, '2024-12-01 12:00:00', 120.50),
(7, 4, 95.00, '2024-12-03 12:00:00', 0.00);

INSERT INTO treatment_types (treatment_name, default_price, default_duration)
VALUES
('בייסיק', 300.00, 30),
('יופי', 450.00, 90),
('ספא', 400.00, 90),
('אנטי איגינג', 350.00, 90),
('מזותרפיה', 300.00, 40),
('פוסט אקנה', 320.00, 60),
('חלק מסדרה', 400.00, 50);

INSERT INTO treatments ( client_id, treatment_type_id, treatment_date, duration, summary, treatment_price, amount_paid, is_special_price, price_note)
VALUES
(4, 1, '2024-12-01 10:00:00', 30, 'תיאור טיפול', 300.00, 300.00, FALSE, NULL),
(5, 2, '2024-12-02 14:00:00', 90, 'פילינג כימי לניקוי עור עמוק.', 450.00, 0.00, FALSE, NULL),
(5, 2, '2024-12-02 16:00:00', 90, 'תיאור טיפול', 380.00, 200.00, TRUE, 'מחיר מיוחד ללקוחה'),
(5, 3, '2024-10-02 14:00:00', 90, 'פילינג כימי לניקוי עור עמוק.', 400.00, 400.00, FALSE, NULL),
(5, 3, '2025-01-02 14:00:00', 90, 'פילינג כימי לניקוי עור עמוק.', 400.00, 400.00, FALSE, NULL),
(5, 1, '2024-11-02 14:00:00', 90, 'פילינג כימי לניקוי עור עמוק.', 300.00, 0.00, FALSE, NULL),
(5, 4, '2024-09-02 14:00:00', 90, 'פילינג כימי לניקוי עור עמוק.', 350.00, 350.00, FALSE, NULL),
(6, 5, '2024-12-03 09:00:00', 40, 'תיאור טיפול', 300.00, 300.00, FALSE, NULL),
(7, 6, '2024-12-04 12:00:00', 60, 'תיאור טיפול', 320.00, 0.00, FALSE, NULL),
(8, 7, '2024-12-05 11:00:00', 50, 'תיאור טיפול', 400.00, 400.00, FALSE, NULL);

INSERT INTO payments (client_id, payment_date, payment_source, target_type, treatment_id, purchase_id, amount_received, amount_applied, note)
VALUES
(4, '2024-12-01 10:30:00', 'DIRECT', 'TREATMENT', 1, NULL, 300.00, 300.00, 'תשלום מלא על טיפול'),
(5, '2024-12-02 16:30:00', 'DIRECT', 'TREATMENT', 3, NULL, 200.00, 200.00, 'תשלום חלקי'),
(5, '2024-10-02 14:30:00', 'DIRECT', 'TREATMENT', 4, NULL, 400.00, 400.00, 'תשלום מלא'),
(5, '2025-01-02 14:30:00', 'DIRECT', 'TREATMENT', 5, NULL, 500.00, 400.00, '400 לטיפול ו-100 נוספו ליתרת הזכות'),
(5, '2024-09-02 14:30:00', 'DIRECT', 'TREATMENT', 7, NULL, 350.00, 350.00, 'תשלום מלא'),
(6, '2024-12-03 09:30:00', 'DIRECT', 'TREATMENT', 8, NULL, 300.00, 300.00, 'תשלום מלא'),
(8, '2024-12-05 11:30:00', 'DIRECT', 'TREATMENT', 10, NULL, 400.00, 400.00, 'תשלום מלא'),
(5, '2024-12-01 12:30:00', 'DIRECT', 'PURCHASE', NULL, 1, 120.50, 120.50, 'תשלום מלא על מוצר');

INSERT INTO images (user_id, image_type, image_path, description, uploaded_by) 
VALUES 
(4, 'treatment', 'https://hahacanvas.co.il/wp-content/uploads/2019/01/753567-300x300.jpg', 'תמונה לפני הטיפול ב 14.07', 1),
(4, 'treatment', 'https://img.adira.co.il/Products/2218/1371547344-pic1.jpg',  'תמונה אחרי הטיפול ב 14.07', 4),
(4, 'treatment', 'https://www.wall-express.co.il/wp-content/uploads/2021/02/Depositphotos_49036513_ds-1.jpg',  'תמונה לפני הטיפול ב 05.08', 1),
(4, 'treatment', 'https://www.wildtravel.co.il/wp-content/uploads/2020/07/2295-2296-small-2.jpg',  'תמונה אחרי הטיפול ב 05.08', 4),
(5, 'treatment', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWTnqekI8Bhq1d38GdgsmcPYwpj99pSR-RzY7nAk8HXAIxYqXB7vQnwQDOY-9KBgJDmBo&usqp=CAU', 'Before treatment photo', 1),
(6, 'treatment', 'https://hahacanvas.co.il/wp-content/uploads/2021/11/%D7%AA%D7%9E%D7%95%D7%A0%D7%95%D7%AA-%D7%99%D7%A4%D7%95%D7%AA-%D7%9C%D7%94%D7%93%D7%A4%D7%A1%D7%94-20.jpg', 'Before treatment photo', 6),
(3, 'profile', "https://i.pinimg.com/736x/0f/8c/24/0f8c2435469b255d6e349d607cec4075.jpg", 'Profile picture', 3),
(4, 'profile', 'https://i.pinimg.com/736x/ff/1a/6b/ff1a6b4e3bacd09b6d2148ede0391a0a.jpg', 'Profile picture', 4),
(5, 'profile', 'https://i.pinimg.com/736x/dd/2f/49/dd2f49bb29d03dccc3013f17f4929c25.jpg', 'Profile picture', 5),
(6, 'profile', 'https://i.pinimg.com/736x/a9/19/59/a919598dafc1b4dda6e4826dac83f3fe.jpg', 'Profile picture', 6),
(8, 'profile', 'https://i.pinimg.com/736x/de/74/dc/de74dcc05837c0dd65d9ed4b037c54dd.jpg', 'Profile picture', 8),
(7, 'profile', 'https://i.pinimg.com/736x/03/b7/56/03b756d7d8770ee8229209495b154362.jpg', 'Profile picture', 7),
(1, 'clinic', 'path/to/clinic1.jpg', 'Clinic photo for website', 1),
(1, 'clinic', 'path/to/clinic_image1.jpg', 'Clinic view', 1),
(2, 'clinic', 'path/to/clinic_image2.jpg', 'Treatment room', 2);

INSERT INTO images (user_id, product_id, image_type, image_path, description, uploaded_by) 
VALUES
(1, 1, 'product', 'https://iconix.co.il/cdn/shop/files/PEELANDREVIVEICONIX.webp?v=1707205976', '1מוצר', 1),
(1, 2, 'product', 'https://iconix.co.il/cdn/shop/files/LUNARBLISSICONIX.webp?v=1707205910', '2מוצר', 1),
(1, 3, 'product', 'https://iconix.co.il/cdn/shop/files/SKINELIXIR.webp?v=1707206016', '3מוצר', 1),
(1, 4, 'product', 'https://iconix.co.il/cdn/shop/files/GROW7.webp?v=1717054882', '4מוצר', 1),
(1, 5, 'product', 'https://iconix.co.il/cdn/shop/files/STARTHERAPYICONIX.webp?v=1707206041', '5מוצר', 1);

UPDATE products SET purchase_count = 1 WHERE product_id = 2;
UPDATE products SET purchase_count = 1 WHERE product_id = 4;

-- INSERT לתוך users
INSERT INTO users (username, first_name, last_name, email, phone, birth_date, role_id, is_verified)
VALUES
('client9', 'לקוח', 'אוטומטי', 'client9@example.com', '0500000009', '1990-01-01', 2, TRUE),
('client10', 'לקוח', 'אוטומטי', 'client10@example.com', '0500000010', '1990-01-01', 2, TRUE),
('client11', 'לקוח', 'אוטומטי', 'client11@example.com', '0500000011', '1990-01-01', 2, TRUE),
('client12', 'לקוח', 'אוטומטי', 'client12@example.com', '0500000012', '1990-01-01', 2, TRUE),
('client13', 'לקוח', 'אוטומטי', 'client13@example.com', '0500000013', '1990-01-01', 2, TRUE),
('client14', 'לקוח', 'אוטומטי', 'client14@example.com', '0500000014', '1990-01-01', 2, TRUE),
('client15', 'לקוח', 'אוטומטי', 'client15@example.com', '0500000015', '1990-01-01', 2, TRUE),
('client16', 'לקוח', 'אוטומטי', 'client16@example.com', '0500000016', '1990-01-01', 2, TRUE),
('client17', 'לקוח', 'אוטומטי', 'client17@example.com', '0500000017', '1990-01-01', 2, TRUE),
('client18', 'לקוח', 'אוטומטי', 'client18@example.com', '0500000018', '1990-01-01', 2, TRUE),
('client19', 'לקוח', 'אוטומטי', 'client19@example.com', '0500000019', '1990-01-01', 2, TRUE),
('client20', 'לקוח', 'אוטומטי', 'client20@example.com', '0500000020', '1990-01-01', 2, TRUE),
('client21', 'לקוח', 'אוטומטי', 'client21@example.com', '0500000021', '1990-01-01', 2, TRUE),
('client22', 'לקוח', 'אוטומטי', 'client22@example.com', '0500000022', '1990-01-01', 2, TRUE),
('client23', 'לקוח', 'אוטומטי', 'client23@example.com', '0500000023', '1990-01-01', 2, TRUE),
('client24', 'לקוח', 'אוטומטי', 'client24@example.com', '0500000024', '1990-01-01', 2, TRUE),
('client25', 'לקוח', 'אוטומטי', 'client25@example.com', '0500000025', '1990-01-01', 2, TRUE),
('client26', 'לקוח', 'אוטומטי', 'client26@example.com', '0500000026', '1990-01-01', 2, TRUE),
('client27', 'לקוח', 'אוטומטי', 'client27@example.com', '0500000027', '1990-01-01', 2, TRUE),
('client28', 'לקוח', 'אוטומטי', 'client28@example.com', '0500000028', '1990-01-01', 2, TRUE),
('client29', 'לקוח', 'אוטומטי', 'client29@example.com', '0500000029', '1990-01-01', 2, TRUE),
('client30', 'לקוח', 'אוטומטי', 'client30@example.com', '0500000030', '1990-01-01', 2, TRUE),
('client31', 'לקוח', 'אוטומטי', 'client31@example.com', '0500000031', '1990-01-01', 2, TRUE),
('client32', 'לקוח', 'אוטומטי', 'client32@example.com', '0500000032', '1990-01-01', 2, TRUE),
('client33', 'לקוח', 'אוטומטי', 'client33@example.com', '0500000033', '1990-01-01', 2, TRUE),
('client34', 'לקוח', 'אוטומטי', 'client34@example.com', '0500000034', '1990-01-01', 2, TRUE),
('client35', 'לקוח', 'אוטומטי', 'client35@example.com', '0500000035', '1990-01-01', 2, TRUE),
('client36', 'לקוח', 'אוטומטי', 'client36@example.com', '0500000036', '1990-01-01', 2, TRUE),
('client37', 'לקוח', 'אוטומטי', 'client37@example.com', '0500000037', '1990-01-01', 2, TRUE),
('client38', 'לקוח', 'אוטומטי', 'client38@example.com', '0500000038', '1990-01-01', 2, TRUE);

-- INSERT לתוך passwords
INSERT INTO passwords (user_id, user_password, salt)
VALUES
(9,  '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(10, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(11, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(12, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(13, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(14, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(15, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(16, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(17, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(18, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(19, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(20, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(21, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(22, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(23, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(24, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(25, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(26, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(27, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(28, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(29, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(30, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(31, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(32, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(33, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(34, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(35, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(36, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(37, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15'),
(38, '464e1a2683f24ff030f2deb7bb3452903ba9afb8cc67ad260e2efe6a42a8cf5f', '2a0280e31556715cbef22eca1b36ef15');

INSERT INTO clients (client_id, treatment_status, skin_type)
VALUES 
(9, 'שלב 1 - איבחון', 'רגיל'),
(10, 'שלב 2 - אסטרטגיה', 'שמן'),
(11, 'שלב 3 - טיפול בקליניקה', 'מעורב'),
(12, 'שלב 4 - התמדה ומעקב', 'יבש וחסר לחות'),
(13, 'עדיין לא פנתה לקבלת שירות', 'רגיל'),
(14, 'שלב 1 - איבחון', 'בעייתי'),
(15, 'שלב 2 - אסטרטגיה', 'רגיל'),
(16, 'שלב 3 - טיפול בקליניקה', 'שמן'),
(17, 'שלב 4 - התמדה ומעקב', 'מעורב'),
(18, 'עדיין לא פנתה לקבלת שירות', 'רגיל'),
(19, 'שלב 1 - איבחון', 'רגיל'),
(20, 'שלב 2 - אסטרטגיה', 'שמן'),
(21, 'שלב 3 - טיפול בקליניקה', 'מעורב'),
(22, 'שלב 4 - התמדה ומעקב', 'יבש וחסר לחות'),
(23, 'עדיין לא פנתה לקבלת שירות', 'רגיל'),
(24, 'שלב 1 - איבחון', 'בעייתי'),
(25, 'שלב 2 - אסטרטגיה', 'רגיל'),
(26, 'שלב 3 - טיפול בקליניקה', 'שמן'),
(27, 'שלב 4 - התמדה ומעקב', 'מעורב'),
(28, 'עדיין לא פנתה לקבלת שירות', 'רגיל'),
(29, 'שלב 1 - איבחון', 'רגיל'),
(30, 'שלב 2 - אסטרטגיה', 'שמן'),
(31, 'שלב 3 - טיפול בקליניקה', 'מעורב'),
(32, 'שלב 4 - התמדה ומעקב', 'יבש וחסר לחות'),
(33, 'עדיין לא פנתה לקבלת שירות', 'רגיל'),
(34, 'שלב 1 - איבחון', 'בעייתי'),
(35, 'שלב 2 - אסטרטגיה', 'רגיל'),
(36, 'שלב 3 - טיפול בקליניקה', 'שמן'),
(37, 'שלב 4 - התמדה ומעקב', 'מעורב'),
(38, 'עדיין לא פנתה לקבלת שירות', 'רגיל');
