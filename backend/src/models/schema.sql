CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    password_hash TEXT,
    role TEXT,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_name TEXT,
    contact_person TEXT,
    mobile TEXT,
    email TEXT,
    city TEXT,
    created_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    product_code TEXT,
    product_name TEXT,
    category TEXT,
    unit TEXT,
    base_price NUMERIC
);

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    physical_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquiries (
    id SERIAL PRIMARY KEY,
    enquiry_number TEXT,
    customer_id INTEGER,
    enquiry_date DATE,
    required_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'NEW'
);

CREATE TABLE IF NOT EXISTS enquiry_items (
    id SERIAL PRIMARY KEY,
    enquiry_id INTEGER,
    product_id INTEGER,
    quantity INTEGER
);

CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    quotation_number TEXT,
    enquiry_id INTEGER,
    customer_id INTEGER,
    valid_until DATE,
    status TEXT DEFAULT 'DRAFT',
    total_amount NUMERIC DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id SERIAL PRIMARY KEY,
    quotation_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price NUMERIC,
    discount_percent NUMERIC DEFAULT 0.00,
    gst_percent NUMERIC DEFAULT 18.00,
    line_amount NUMERIC
);

CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY,
    order_number TEXT,
    quotation_id INTEGER,
    customer_id INTEGER,
    order_date DATE,
    total_amount NUMERIC,
    status TEXT DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS sales_order_items (
    id SERIAL PRIMARY KEY,
    sales_order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER
);

CREATE TABLE IF NOT EXISTS dispatches (
    id SERIAL PRIMARY KEY,
    dispatch_number TEXT,
    sales_order_id INTEGER,
    dispatch_date DATE,
    vehicle_number TEXT,
    driver_name TEXT
);

CREATE TABLE IF NOT EXISTS dispatch_items (
    id SERIAL PRIMARY KEY,
    dispatch_id INTEGER,
    product_id INTEGER,
    quantity INTEGER
);
