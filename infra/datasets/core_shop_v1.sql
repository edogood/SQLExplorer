CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  country VARCHAR(2)
);
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  category VARCHAR(50),
  price NUMERIC(10,2)
);
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY,
  customer_id INT,
  created_at TIMESTAMP,
  total NUMERIC(10,2)
);
CREATE TABLE IF NOT EXISTS order_items (
  order_id INT,
  product_id INT,
  quantity INT,
  price NUMERIC(10,2)
);
INSERT INTO customers VALUES (1,'Alice','IT'),(2,'Bob','DE'),(3,'Carla','FR');
INSERT INTO products VALUES (1,'Keyboard','tech',50.00),(2,'Mouse','tech',20.00),(3,'Chair','furniture',120.00);
INSERT INTO orders VALUES (1,1,'2024-01-10',70.00),(2,2,'2024-01-11',120.00),(3,1,'2024-01-12',140.00);
INSERT INTO order_items VALUES (1,1,1,50.00),(1,2,1,20.00),(2,3,1,120.00),(3,1,2,100.00),(3,2,2,40.00);
