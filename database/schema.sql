CREATE DATABASE IF NOT EXISTS gym_management;
USE gym_management;


CREATE TABLE business_info (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gym_name VARCHAR(150) NOT NULL,
  address VARCHAR(255),
  contact_no VARCHAR(20),
  city VARCHAR(100),
  logo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  software_password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE admin_users ADD COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user' AFTER email;

CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  admin_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);



CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);


CREATE TABLE license (
  id INT AUTO_INCREMENT PRIMARY KEY,
  valid_days INT NOT NULL,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status ENUM('active', 'expired') NOT NULL DEFAULT 'active',
  checksum VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE membership_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  duration_days INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trainers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  gender ENUM('male', 'female', 'other') DEFAULT 'male',
  specialization VARCHAR(150),
  experience_years INT DEFAULT 0,
  photo_url VARCHAR(255),
  employment_type ENUM('salary', 'commission', 'freelance') DEFAULT 'salary',
  base_salary DECIMAL(10,2) DEFAULT 0,
  session_fee DECIMAL(10,2) DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  gender ENUM('male', 'female', 'other') DEFAULT 'male',
  dob DATE,
  address VARCHAR(255),
  emergency_name VARCHAR(100),
  emergency_phone VARCHAR(20),
  photo_url VARCHAR(255),
  plan_id INT,
  trainer_id INT,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status ENUM('active', 'frozen', 'expired', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

ALTER TABLE members ADD COLUMN frozen_at DATE NULL AFTER status;

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('cash', 'card', 'bank') DEFAULT 'cash',
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE membership_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  plan_id INT,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  action ENUM('new', 'renew', 'upgrade', 'downgrade', 'freeze', 'cancel') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(id) ON DELETE SET NULL
);


CREATE TABLE equipment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  quantity INT DEFAULT 1,
  purchase_date DATE,
  purchase_cost DECIMAL(10,2),
  warranty_expiry DATE,
  status ENUM('working', 'maintenance', 'out_of_order') DEFAULT 'working',
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipment_maintenance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  cost DECIMAL(10,2),
  maintenance_date DATE NOT NULL,
  next_due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  membership_history_id INT,
  description VARCHAR(255),
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (membership_history_id) REFERENCES membership_history(id) ON DELETE SET NULL
);

ALTER TABLE payments ADD COLUMN invoice_id INT NULL AFTER member_id;
ALTER TABLE payments ADD FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD COLUMN plan_amount DECIMAL(10,2) DEFAULT 0 AFTER description,
  ADD COLUMN plan_discount DECIMAL(10,2) DEFAULT 0 AFTER plan_amount,
  ADD COLUMN trainer_fee DECIMAL(10,2) DEFAULT 0 AFTER plan_discount,
  ADD COLUMN trainer_discount DECIMAL(10,2) DEFAULT 0 AFTER trainer_fee,
  ADD COLUMN overall_discount DECIMAL(10,2) DEFAULT 0 AFTER trainer_discount,
  ADD COLUMN change_due DECIMAL(10,2) DEFAULT 0 AFTER amount_paid;

CREATE TABLE trainer_salary_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pay_month DATE NOT NULL,
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255),
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  gender ENUM('male', 'female', 'other') DEFAULT 'male',
  role VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  emergency_name VARCHAR(100),
  emergency_phone VARCHAR(20),
  photo_url VARCHAR(255),
  join_date DATE,
  employment_type ENUM('salary', 'hourly', 'freelance') DEFAULT 'salary',
  base_salary DECIMAL(10,2) DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_salary_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pay_month DATE NOT NULL,
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(255),
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

CREATE TABLE shop_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  purchase_price DECIMAL(10,2) NOT NULL,
  sold_price DECIMAL(10,2) NOT NULL,
  quantity INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  purchase_date DATE,
  expiry_date DATE,
  supplier_name VARCHAR(150),
  supplier_company VARCHAR(150),
  supplier_city VARCHAR(100),
  supplier_contact VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE shop_products ADD COLUMN sold_quantity INT DEFAULT 0 AFTER quantity;

CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(150),
  customer_city VARCHAR(100),
  customer_contact VARCHAR(20),
  subtotal DECIMAL(10,2) NOT NULL,
  discount_type ENUM('amount', 'percent') DEFAULT 'amount',
  discount_value DECIMAL(10,2) DEFAULT 0,
  tax_type ENUM('amount', 'percent') DEFAULT 'amount',
  tax_value DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sales ADD COLUMN payment_method ENUM('cash', 'card', 'bank') DEFAULT 'cash' AFTER customer_contact;
ALTER TABLE sales ADD COLUMN received_amount DECIMAL(10,2) DEFAULT 0 AFTER grand_total;
ALTER TABLE sales ADD COLUMN change_amount DECIMAL(10,2) DEFAULT 0 AFTER received_amount;

CREATE TABLE sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  discount_type ENUM('amount', 'percent') DEFAULT 'amount',
  discount_value DECIMAL(10,2) DEFAULT 0,
  tax_type ENUM('amount', 'percent') DEFAULT 'amount',
  tax_value DECIMAL(10,2) DEFAULT 0,
  line_total DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE SET NULL
);

ALTER TABLE sales ADD COLUMN invoice_no VARCHAR(50) AFTER id;
ALTER TABLE sales ADD COLUMN profit DECIMAL(10,2) DEFAULT 0 AFTER grand_total;
ALTER TABLE sale_items ADD COLUMN purchase_price DECIMAL(10,2) DEFAULT 0 AFTER price;


CREATE TABLE trial_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255),
  trial_start_date DATE NOT NULL,
  trial_end_date DATE NOT NULL,
  status ENUM('ongoing', 'converted', 'not_converted') DEFAULT 'ongoing',
  converted_member_id INT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (converted_member_id) REFERENCES members(id) ON DELETE SET NULL
);

CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_type VARCHAR(100) NOT NULL,
  title VARCHAR(150),
  amount DECIMAL(10,2) NOT NULL,
  days INT NOT NULL DEFAULT 1,
  expense_date DATE NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);