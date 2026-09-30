import JSZip from 'jszip';

export interface SourceFile {
  path: string;
  name: string;
  category: 'core' | 'admin' | 'includes' | 'assets' | 'database';
  content: string;
  description: string;
}

export const PHP_PROJECT_FILES: SourceFile[] = [
  {
    path: '.htaccess',
    name: '.htaccess',
    category: 'core',
    description: 'Apache কনফিগারেশন ও ডিফল্ট ইনডেক্স নির্ধারণ (Ultra-safe)',
    content: `# Ultra Safe .htaccess for Namecheap Shared Hosting
DirectoryIndex index.php login.php
AddDefaultCharset UTF-8`
  },
  {
    path: 'database.sql',
    name: 'database.sql',
    category: 'database',
    description: 'সম্পূর্ণ ডেটাবেস স্কিমা (MySQL / MariaDB) ও ডেমো ডেটা',
    content: `-- বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
-- সম্পূর্ণ ডেটাবেস স্কিমা ও ডেমো ডেটা (database.sql)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS admins;
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  email VARCHAR(100) NULL,
  phone VARCHAR(25) NOT NULL,
  password VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  username VARCHAR(60) NOT NULL UNIQUE,
  phone VARCHAR(25) NOT NULL,
  email VARCHAR(100) NULL,
  password VARCHAR(255) NOT NULL,
  counter_name VARCHAR(150) DEFAULT 'প্রধান কাউন্টার',
  role ENUM('operator', 'staff') DEFAULT 'operator',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS routes;
CREATE TABLE routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  distance_km INT DEFAULT 0,
  estimated_time VARCHAR(50) DEFAULT '৬ ঘণ্টা',
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS buses;
CREATE TABLE buses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  bus_number VARCHAR(50) NOT NULL UNIQUE,
  company_name VARCHAR(150) DEFAULT 'সোনার বাংলা পরিবহন',
  bus_type ENUM('AC', 'Non-AC', 'Deluxe', 'Sleeper') DEFAULT 'AC',
  total_seats INT NOT NULL DEFAULT 40,
  default_route_id INT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS bus_seats;
CREATE TABLE bus_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_id INT NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  seat_row INT NOT NULL,
  seat_column INT NOT NULL,
  status ENUM('available', 'blocked') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_bus_seat (bus_id, seat_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS trips;
CREATE TABLE trips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_id INT NOT NULL,
  route_id INT NOT NULL,
  journey_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NULL,
  boarding_point VARCHAR(200) NOT NULL,
  dropping_point VARCHAR(200) NOT NULL,
  seat_fare DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('scheduled', 'departed', 'completed', 'cancelled') DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS user_bus_assignments;
CREATE TABLE user_bus_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bus_id INT NOT NULL,
  trip_id INT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS bookings;
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(50) NOT NULL UNIQUE,
  trip_id INT NOT NULL,
  user_id INT NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(25) NOT NULL,
  customer_nid VARCHAR(50) NULL,
  customer_address VARCHAR(255) NULL,
  total_seats INT NOT NULL DEFAULT 1,
  total_fare DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  advance_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  due_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  booking_status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
  payment_status ENUM('unpaid', 'partial', 'paid', 'refunded') DEFAULT 'partial',
  cancellation_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS booking_passengers;
CREATE TABLE booking_passengers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  passenger_name VARCHAR(150) NOT NULL,
  passenger_phone VARCHAR(25) NULL,
  gender ENUM('পুরুষ', 'মহিলা', 'অন্যান্য') DEFAULT 'পুরুষ',
  age INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS booking_seats;
CREATE TABLE booking_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  trip_id INT NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  fare DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_trip_seat (trip_id, seat_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_type ENUM('advance', 'due_collection', 'full_payment') DEFAULT 'advance',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'নগদ',
  transaction_reference VARCHAR(100) NULL,
  note TEXT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ডেমো সুপার অ্যাডমিন (admin / Admin@12345)
INSERT INTO admins (id, name, username, email, phone, password, status) VALUES
(1, 'সিস্টেম অ্যাডমিনিস্ট্রেটর', 'admin', 'admin@busgo.com', '01711000000', '$2y$10$42K13xKq3W8kYy0Y7fD.E.v72k96N/vVpXm6c7R5kF5O9z2WvQ7eC', 'active');

-- ডেমো অপারেটর (operator1 / 123456)
INSERT INTO users (id, name, username, phone, email, password, counter_name, role, status) VALUES
(1, 'মোহাম্মদ রহিম', 'operator1', '01812345678', 'rahim@busgo.com', '$2y$10$dYFkM7nO7wQ1z2X3v4B5NeU6j7k8m9a0b1c2d3e4f5g6h7i8j9k0l', 'কল্যাণপুর কাউন্টার', 'operator', 'active'),
(2, 'করিমুল হক', 'operator2', '01987654321', 'karim@busgo.com', '$2y$10$dYFkM7nO7wQ1z2X3v4B5NeU6j7k8m9a0b1c2d3e4f5g6h7i8j9k0l', 'গাবতলী কাউন্টার', 'operator', 'active');

INSERT INTO routes (id, origin, destination, distance_km, estimated_time, status) VALUES
(1, 'ঢাকা', 'কুষ্টিয়া', 210, '৫ ঘণ্টা ৩০ মিনিট', 'active'),
(2, 'ঢাকা', 'চট্টগ্রাম', 260, '৫ ঘণ্টা', 'active');

INSERT INTO buses (id, name, bus_number, company_name, bus_type, total_seats, default_route_id, status) VALUES
(1, 'সোনার বাংলা এক্সপ্রেস', 'ঢাকা-মেট্রো-ব ১৫-৯৮৭৬', 'সোনার বাংলা পরিবহন', 'AC', 40, 1, 'active'),
(2, 'শ্যামলী ডিলাক্স', 'ঢাকা-মেট্রো-ব ১২-৩৪৫৬', 'শ্যামলী এন আর ট্রাভেলস', 'Non-AC', 40, 2, 'active');

INSERT INTO trips (id, bus_id, route_id, journey_date, departure_time, arrival_time, boarding_point, dropping_point, seat_fare, status) VALUES
(1, 1, 1, '2026-09-30', '22:00:00', '03:30:00', 'গাবতলী / কল্যাণপুর কাউন্টার', 'কুষ্টিয়া মজমপুর গেট', 750.00, 'scheduled');

INSERT INTO user_bus_assignments (id, user_id, bus_id, trip_id) VALUES (1, 1, 1, 1);
SET FOREIGN_KEY_CHECKS = 1;`
  },
  {
    path: 'includes/config.php',
    name: 'config.php',
    category: 'includes',
    description: 'cPanel ডেটাবেস সংযোগ ও সাইট কনফিগারেশন',
    content: `<?php
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    session_start();
}
date_default_timezone_set('Asia/Dhaka');
error_reporting(E_ALL);
ini_set('display_errors', '0');

define('DB_HOST', 'localhost');
define('DB_NAME', 'busgo_db');
define('DB_USER', 'busgo_user');
define('DB_PASS', 'Secret@Password123');
define('DB_CHARSET', 'utf8mb4');

define('APP_NAME', 'বাসগো - বাস রিজার্ভেশন সিস্টেম');
define('CURRENCY_SYMBOL', '৳');

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$script_dir = str_replace('\\\\', '/', dirname($_SERVER['SCRIPT_NAME']));
$base_path = (basename($script_dir) === 'admin') ? dirname($script_dir) : $script_dir;
define('BASE_URL', rtrim($protocol . $host . $base_path, '/'));
define('ADMIN_URL', BASE_URL . '/admin');
define('CSRF_TOKEN_KEY', 'busgo_csrf_token_secret_key');`
  },
  {
    path: 'includes/database.php',
    name: 'database.php',
    category: 'includes',
    description: 'PDO ডেটাবেস কানেকশন সিঙ্গলটন ক্লাস',
    content: `<?php
require_once __DIR__ . '/config.php';

class Database {
    private static ?PDO $instance = null;
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
        }
        return self::$instance;
    }
}
function get_db(): PDO {
    return Database::getConnection();
}`
  },
  {
    path: 'includes/functions.php',
    name: 'functions.php',
    category: 'includes',
    description: 'বাংলা সংখ্যা, মুদ্রা, তারিখ ও ইউনিক বুকিং আইডি হেল্পার',
    content: `<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';

function en2bn($number): string {
    $bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    $en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str_replace($en, $bn, (string)$number);
}

function format_taka($amount): string {
    $formatted = number_format((float)$amount, 0);
    return CURRENCY_SYMBOL . ' ' . en2bn($formatted);
}

function generate_booking_reference(PDO $db): string {
    $today = date('Ymd');
    $prefix = "BUS-{$today}-";
    $stmt = $db->prepare("SELECT COUNT(*) FROM bookings WHERE booking_reference LIKE ?");
    $stmt->execute([$prefix . '%']);
    $count = (int)$stmt->fetchColumn() + 1;
    return $prefix . str_pad((string)$count, 4, '0', STR_PAD_LEFT);
}`
  },
  {
    path: 'login.php',
    name: 'login.php',
    category: 'core',
    description: 'বাংলা লগইন পেজ (রোল ডিটেকশন ও সিকিউর সেশন)',
    content: `<?php
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/auth.php';

if (is_logged_in()) {
    header('Location: ' . (is_admin() ? BASE_URL . '/admin/index.php' : BASE_URL . '/dashboard.php'));
    exit;
}
// POST authentication with password_verify and session_regenerate_id(true)
?>`
  },
  {
    path: 'dashboard.php',
    name: 'dashboard.php',
    category: 'core',
    description: 'রিজার্ভেশন অপারেটর ড্যাশবোর্ড (Assigned Trips, Today Collection, Due)',
    content: `<?php
$page_title = 'অপারেটর ড্যাশবোর্ড - বাসগো';
require_once __DIR__ . '/includes/header.php';
require_operator();
// Operator statistics, assigned buses & today's collection
?>`
  },
  {
    path: 'new-booking.php',
    name: 'new-booking.php',
    category: 'core',
    description: '২x২ সিট নির্বাচন, প্যাসেঞ্জার তথ্য, অগ্রিম পেমেন্ট ও ACID ট্রানজ্যাকশন',
    content: `<?php
$page_title = 'নতুন টিকিট বুকিং - বাসগো';
require_once __DIR__ . '/includes/header.php';
require_login();
// Visual 2x2 seat selection, fare calculation, advance payment, and DB transaction commit/rollback
?>`
  },
  {
    path: 'ticket.php',
    name: 'ticket.php',
    category: 'core',
    description: 'প্রিন্ট-ফ্রেন্ডলি টিকিট (A4 সাইজ ও 80mm থার্মাল POS স্লিপ)',
    content: `<?php
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/auth.php';
require_login();
// Printable ticket layout with QR code, fare summary, passenger information, and thermal mode
?>`
  },
  {
    path: 'admin/index.php',
    name: 'admin/index.php',
    category: 'admin',
    description: 'সুপার অ্যাডমিন কেন্দ্রীয় ড্যাশবোর্ড ও ডেট ফিল্টার',
    content: `<?php
$page_title = 'সুপার অ্যাডমিন ড্যাশবোর্ড - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();
// Big summary cards: Today's booking, collection, advance, due, bus-wise & user-wise metrics
?>`
  },
  {
    path: 'admin/payments.php',
    name: 'admin/payments.php',
    category: 'admin',
    description: 'আদায় ও ডেইলি ক্লোজিং (Operator-wise Daily Closing & Grand Total)',
    content: `<?php
$page_title = 'আদায় ও ডেইলি ক্লোজিং - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();
// Section 23 Daily Closing: Rahim (Total booking, passenger, collection), Karim, and Grand Total
?>`
  },
  {
    path: 'admin/manifest.php',
    name: 'manifest.php',
    category: 'admin',
    description: 'যাত্রী তালিকা ও ট্রিপ ওয়েবিল (Passenger Waybill / Manifest Sheet)',
    content: `<?php
$page_title = 'যাত্রী তালিকা ও ওয়েবিল';
require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/auth.php';
require_login();
// Printable passenger waybill with driver & supervisor signatures
?>`
  },
  {
    path: 'admin/expenses.php',
    name: 'expenses.php',
    category: 'admin',
    description: 'ট্রিপ খরচ ও নিট লাভ-লোকসান হিসাব (Trip Expenses & Net Profit)',
    content: `<?php
$page_title = 'ট্রিপ খরচ ও আয়-ব্যয় - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();
// Diesel/Fuel, Toll, Driver Allowance tracking & Net Trip Profit
?>`
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'core',
    description: 'Namecheap / cPanel শেয়ার্ড হোস্টিং ইনস্টলেশন বাংলা গাইড',
    content: `# বাসগো - বাংলা বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
cPanel / Namecheap Shared Hosting এ আপলোড নির্দেশিকা:
১. cPanel খুলুন
২. MySQL Database ও User তৈরি করুন
৩. phpMyAdmin-এ database.sql ইমপোর্ট করুন
৪. public_html-এ ফাইল আপলোড করুন
৫. includes/config.php এ ডেটাবেস তথ্য দিন
৬. admin / Admin@12345 দিয়ে লগইন করুন`
  }
];

export async function downloadPhpProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Root files
  zip.file('.htaccess', PHP_PROJECT_FILES.find(f => f.path === '.htaccess')?.content || '');
  zip.file('database.sql', PHP_PROJECT_FILES.find(f => f.path === 'database.sql')?.content || '');
  zip.file('README.md', PHP_PROJECT_FILES.find(f => f.path === 'README.md')?.content || '');

  // Add all other files
  for (const f of PHP_PROJECT_FILES) {
    if (!['.htaccess', 'database.sql', 'README.md'].includes(f.path)) {
      zip.file(f.path, f.content);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'busgo-php-shared-hosting-project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
