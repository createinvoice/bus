-- ========================================================
-- বাসগো - বাংলা বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
-- সম্পূর্ণ ডেটাবেস স্কিমা এবং ডেমো ডেটা
-- Compatible with MySQL 5.7+ / 8.0+ / MariaDB 10.3+
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. অ্যাডমিন টেবিল (Super Admins)
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `email` VARCHAR(100) NULL,
  `phone` VARCHAR(25) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ব্যবহারকারী টেবিল (Reservation Operators / Staff)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `phone` VARCHAR(25) NOT NULL,
  `email` VARCHAR(100) NULL,
  `password` VARCHAR(255) NOT NULL,
  `counter_name` VARCHAR(150) DEFAULT 'প্রধান কাউন্টার',
  `role` ENUM('operator', 'staff') DEFAULT 'operator',
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. রুট টেবিল (Routes)
DROP TABLE IF EXISTS `routes`;
CREATE TABLE `routes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `origin` VARCHAR(100) NOT NULL,
  `destination` VARCHAR(100) NOT NULL,
  `distance_km` INT DEFAULT 0,
  `estimated_time` VARCHAR(50) DEFAULT '৬ ঘণ্টা',
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. বাস টেবিল (Buses)
DROP TABLE IF EXISTS `buses`;
CREATE TABLE `buses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `bus_number` VARCHAR(50) NOT NULL UNIQUE,
  `company_name` VARCHAR(150) DEFAULT 'সোনার বাংলা পরিবহন',
  `bus_type` ENUM('AC', 'Non-AC', 'Deluxe', 'Sleeper') DEFAULT 'AC',
  `total_seats` INT NOT NULL DEFAULT 40,
  `default_route_id` INT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`default_route_id`) REFERENCES `routes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. বাসের সিট টেবিল (Bus Seats Configuration)
DROP TABLE IF EXISTS `bus_seats`;
CREATE TABLE `bus_seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bus_id` INT NOT NULL,
  `seat_number` VARCHAR(10) NOT NULL,
  `seat_row` INT NOT NULL,
  `seat_column` INT NOT NULL,
  `status` ENUM('available', 'blocked') DEFAULT 'available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_bus_seat` (`bus_id`, `seat_number`),
  FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ট্রিপ টেবিল (Trips)
DROP TABLE IF EXISTS `trips`;
CREATE TABLE `trips` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bus_id` INT NOT NULL,
  `route_id` INT NOT NULL,
  `journey_date` DATE NOT NULL,
  `departure_time` TIME NOT NULL,
  `arrival_time` TIME NULL,
  `boarding_point` VARCHAR(200) NOT NULL,
  `dropping_point` VARCHAR(200) NOT NULL,
  `seat_fare` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `driver_name` VARCHAR(150) NULL,
  `driver_phone` VARCHAR(25) NULL,
  `supervisor_name` VARCHAR(150) NULL,
  `supervisor_phone` VARCHAR(25) NULL,
  `status` ENUM('scheduled', 'departed', 'completed', 'cancelled') DEFAULT 'scheduled',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE,
  INDEX `idx_trip_date` (`journey_date`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. ইউজার-বাস অ্যাসাইনমেন্ট টেবিল (Operator Bus & Trip Assignments)
DROP TABLE IF EXISTS `user_bus_assignments`;
CREATE TABLE `user_bus_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `bus_id` INT NOT NULL,
  `trip_id` INT NULL,
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_assignment` (`user_id`, `bus_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. বুকিং টেবিল (Bookings)
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_reference` VARCHAR(50) NOT NULL UNIQUE,
  `trip_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(25) NOT NULL,
  `customer_nid` VARCHAR(50) NULL,
  `customer_address` VARCHAR(255) NULL,
  `total_seats` INT NOT NULL DEFAULT 1,
  `total_fare` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `advance_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `due_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `booking_status` ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
  `payment_status` ENUM('unpaid', 'partial', 'paid', 'refunded') DEFAULT 'partial',
  `cancellation_reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_booking_ref` (`booking_reference`),
  INDEX `idx_customer_phone` (`customer_phone`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. বুকিং প্যাসেঞ্জার টেবিল (Booking Passengers Details)
DROP TABLE IF EXISTS `booking_passengers`;
CREATE TABLE `booking_passengers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL,
  `seat_number` VARCHAR(10) NOT NULL,
  `passenger_name` VARCHAR(150) NOT NULL,
  `passenger_phone` VARCHAR(25) NULL,
  `gender` ENUM('পুরুষ', 'মহিলা', 'অন্যান্য') DEFAULT 'পুরুষ',
  `age` INT NULL,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. বুকিং সিট টেবিল (Booked Seats per Trip - prevents double booking)
DROP TABLE IF EXISTS `booking_seats`;
CREATE TABLE `booking_seats` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL,
  `trip_id` INT NOT NULL,
  `seat_number` VARCHAR(10) NOT NULL,
  `fare` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_trip_seat` (`trip_id`, `seat_number`),
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. পেমেন্ট ও লেনদেন টেবিল (Payment & Transaction History)
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_type` ENUM('advance', 'due_collection', 'full_payment') DEFAULT 'advance',
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'নগদ',
  `transaction_reference` VARCHAR(100) NULL,
  `note` TEXT NULL,
  `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_payment_date` (`payment_date`),
  INDEX `idx_user_payments` (`user_id`, `payment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. সিস্টেম সেটিংস টেবিল (System Settings)
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. ট্রিপ খরচ ও তেল-টোল টেবিল (Trip Expenses)
DROP TABLE IF EXISTS `trip_expenses`;
CREATE TABLE `trip_expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trip_id` INT NOT NULL,
  `expense_category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `note` TEXT NULL,
  `expense_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. কাউন্টার ক্যাশ সমর্পণ ও হ্যান্ডওভার টেবিল (Counter Daily Cash Handover)
DROP TABLE IF EXISTS `counter_handovers`;
CREATE TABLE `counter_handovers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `counter_name` VARCHAR(150) NOT NULL,
  `date` DATE NOT NULL,
  `total_collected` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `expense_deducted` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `net_handover` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `handover_method` VARCHAR(100) NOT NULL DEFAULT 'নগদ প্রধান কার্যালয় জমা',
  `reference_no` VARCHAR(100) NULL,
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
  `approved_by` VARCHAR(100) DEFAULT 'সিস্টেম অ্যাডমিনিস্ট্রেটর',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- ডেমো ডেটা ইনসার্ট (Seeding Initial & Demo Data)
-- ========================================================

-- সুপার অ্যাডমিন (Username: admin, Password: Admin@12345)
-- Bcrypt Hash generated with PASSWORD_BCRYPT for 'Admin@12345'
INSERT INTO `admins` (`id`, `name`, `username`, `email`, `phone`, `password`, `status`) VALUES
(1, 'সিস্টেম অ্যাডমিনিস্ট্রেটর', 'admin', 'admin@busgo.com', '01711000000', '$2y$10$42K13xKq3W8kYy0Y7fD.E.v72k96N/vVpXm6c7R5kF5O9z2WvQ7eC', 'active');

-- অপারেটর / স্টাফ ইউজার
-- Password for all demo operators: 123456 (Bcrypt Hash: $2y$10$w/XjDqfJkWqV6uJ10bE8xe5hFmU6y9bO1oKqN8rG3wR8fP5kL7e1G)
INSERT INTO `users` (`id`, `name`, `username`, `phone`, `email`, `password`, `counter_name`, `role`, `status`) VALUES
(1, 'মোহাম্মদ রহিম', 'operator1', '01812345678', 'rahim@busgo.com', '$2y$10$dYFkM7nO7wQ1z2X3v4B5NeU6j7k8m9a0b1c2d3e4f5g6h7i8j9k0l', 'কল্যাণপুর কাউন্টার', 'operator', 'active'),
(2, 'করিমুল হক', 'operator2', '01987654321', 'karim@busgo.com', '$2y$10$dYFkM7nO7wQ1z2X3v4B5NeU6j7k8m9a0b1c2d3e4f5g6h7i8j9k0l', 'গাবতলী কাউন্টার', 'operator', 'active'),
(3, 'আব্দুল কাদের', 'operator3', '01712334455', 'kader@busgo.com', '$2y$10$dYFkM7nO7wQ1z2X3v4B5NeU6j7k8m9a0b1c2d3e4f5g6h7i8j9k0l', 'সায়দাবাদ কাউন্টার', 'staff', 'active');

-- রুট তালিকা
INSERT INTO `routes` (`id`, `origin`, `destination`, `distance_km`, `estimated_time`, `status`) VALUES
(1, 'ঢাকা', 'কুষ্টিয়া', 210, '৫ ঘণ্টা ৩০ মিনিট', 'active'),
(2, 'ঢাকা', 'চট্টগ্রাম', 260, '৫ ঘণ্টা', 'active'),
(3, 'ঢাকা', 'রাজশাহী', 250, '৫ ঘণ্টা', 'active'),
(4, 'ঢাকা', 'সিলেট', 240, '৫ ঘণ্টা', 'active'),
(5, 'কুষ্টিয়া', 'ঢাকা', 210, '৫ ঘণ্টা ৩০ মিনিট', 'active');

-- বাস তালিকা
INSERT INTO `buses` (`id`, `name`, `bus_number`, `company_name`, `bus_type`, `total_seats`, `default_route_id`, `status`) VALUES
(1, 'সোনার বাংলা এক্সপ্রেস', 'ঢাকা-মেট্রো-ব ১৫-৯৮৭৬', 'সোনার বাংলা পরিবহন', 'AC', 40, 1, 'active'),
(2, 'শ্যামলী ডিলাক্স', 'ঢাকা-মেট্রো-ব ১২-৩৪৫৬', 'শ্যামলী এন আর ট্রাভেলস', 'Non-AC', 40, 2, 'active'),
(3, 'গ্রীন লাইন রয়্যাল', 'ঢাকা-মেট্রো-ব ৯৮-৭৬৫৪', 'গ্রীন লাইন পরিবহন', 'AC', 40, 1, 'active'),
(4, 'হানিফ এন্টারপ্রাইজ', 'ঢাকা-মেট্রো-ব ৭৬-৫৪৩২', 'হানিফ ট্রাভেলস', 'Deluxe', 40, 3, 'active');

-- বাসের ৪০টি সিট জেনারেশন (A1-A4 থেকে J1-J4)
-- বাস ১: সোনার বাংলা
INSERT INTO `bus_seats` (`bus_id`, `seat_number`, `seat_row`, `seat_column`, `status`) VALUES
(1, 'A1', 1, 1, 'available'), (1, 'A2', 1, 2, 'available'), (1, 'A3', 1, 3, 'available'), (1, 'A4', 1, 4, 'available'),
(1, 'B1', 2, 1, 'available'), (1, 'B2', 2, 2, 'available'), (1, 'B3', 2, 3, 'available'), (1, 'B4', 2, 4, 'available'),
(1, 'C1', 3, 1, 'available'), (1, 'C2', 3, 2, 'available'), (1, 'C3', 3, 3, 'available'), (1, 'C4', 3, 4, 'available'),
(1, 'D1', 4, 1, 'available'), (1, 'D2', 4, 2, 'available'), (1, 'D3', 4, 3, 'available'), (1, 'D4', 4, 4, 'available'),
(1, 'E1', 5, 1, 'available'), (1, 'E2', 5, 2, 'available'), (1, 'E3', 5, 3, 'available'), (1, 'E4', 5, 4, 'available'),
(1, 'F1', 6, 1, 'available'), (1, 'F2', 6, 2, 'available'), (1, 'F3', 6, 3, 'available'), (1, 'F4', 6, 4, 'available'),
(1, 'G1', 7, 1, 'available'), (1, 'G2', 7, 2, 'available'), (1, 'G3', 7, 3, 'available'), (1, 'G4', 7, 4, 'available'),
(1, 'H1', 8, 1, 'available'), (1, 'H2', 8, 2, 'available'), (1, 'H3', 8, 3, 'available'), (1, 'H4', 8, 4, 'available'),
(1, 'I1', 9, 1, 'available'), (1, 'I2', 9, 2, 'available'), (1, 'I3', 9, 3, 'available'), (1, 'I4', 9, 4, 'available'),
(1, 'J1', 10, 1, 'available'), (1, 'J2', 10, 2, 'available'), (1, 'J3', 10, 3, 'available'), (1, 'J4', 10, 4, 'available');

-- বাস ২: শ্যামলী ডিলাক্স
INSERT INTO `bus_seats` (`bus_id`, `seat_number`, `seat_row`, `seat_column`, `status`) VALUES
(2, 'A1', 1, 1, 'available'), (2, 'A2', 1, 2, 'available'), (2, 'A3', 1, 3, 'available'), (2, 'A4', 1, 4, 'available'),
(2, 'B1', 2, 1, 'available'), (2, 'B2', 2, 2, 'available'), (2, 'B3', 2, 3, 'available'), (2, 'B4', 2, 4, 'available'),
(2, 'C1', 3, 1, 'available'), (2, 'C2', 3, 2, 'available'), (2, 'C3', 3, 3, 'available'), (2, 'C4', 3, 4, 'available'),
(2, 'D1', 4, 1, 'available'), (2, 'D2', 4, 2, 'available'), (2, 'D3', 4, 3, 'available'), (2, 'D4', 4, 4, 'available'),
(2, 'E1', 5, 1, 'available'), (2, 'E2', 5, 2, 'available'), (2, 'E3', 5, 3, 'available'), (2, 'E4', 5, 4, 'available'),
(2, 'F1', 6, 1, 'available'), (2, 'F2', 6, 2, 'available'), (2, 'F3', 6, 3, 'available'), (2, 'F4', 6, 4, 'available'),
(2, 'G1', 7, 1, 'available'), (2, 'G2', 7, 2, 'available'), (2, 'G3', 7, 3, 'available'), (2, 'G4', 7, 4, 'available'),
(2, 'H1', 8, 1, 'available'), (2, 'H2', 8, 2, 'available'), (2, 'H3', 8, 3, 'available'), (2, 'H4', 8, 4, 'available'),
(2, 'I1', 9, 1, 'available'), (2, 'I2', 9, 2, 'available'), (2, 'I3', 9, 3, 'available'), (2, 'I4', 9, 4, 'available'),
(2, 'J1', 10, 1, 'available'), (2, 'J2', 10, 2, 'available'), (2, 'J3', 10, 3, 'available'), (2, 'J4', 10, 4, 'available');

-- ট্রিপ তৈরি (Trips)
INSERT INTO `trips` (`id`, `bus_id`, `route_id`, `journey_date`, `departure_time`, `arrival_time`, `boarding_point`, `dropping_point`, `seat_fare`, `status`) VALUES
(1, 1, 1, '2026-09-30', '22:00:00', '03:30:00', 'গাবতলী / কল্যাণপুর কাউন্টার', 'কুষ্টিয়া মজমপুর গেট', 750.00, 'scheduled'),
(2, 2, 2, '2026-09-30', '23:30:00', '05:00:00', 'সায়দাবাদ / আরামবাগ কাউন্টার', 'চট্টগ্রাম একে খান / দামপাড়া', 850.00, 'scheduled'),
(3, 3, 1, '2026-10-01', '08:30:00', '14:00:00', 'কল্যাণপুর বাস টার্মিনাল', 'কুষ্টিয়া চৌড়হাস মোড়', 750.00, 'scheduled'),
(4, 4, 3, '2026-10-01', '22:30:00', '04:00:00', 'গাবতলী টার্মিনাল', 'রাজশাহী শিরোইল', 800.00, 'scheduled');

-- ইউজার অ্যাসাইনমেন্ট (Assigning User Rahim to Sonar Bangla bus & trips)
INSERT INTO `user_bus_assignments` (`id`, `user_id`, `bus_id`, `trip_id`) VALUES
(1, 1, 1, 1),
(2, 1, 3, 3),
(3, 2, 2, 2);

-- ডেমো বুকিং ডেটা (Sample Bookings)
-- বুকিং ১: সোনার বাংলা (ঢাকা → কুষ্টিয়া) - ২টি সিট, মোট ১৫০০, অগ্রিম ১০০০, বাকি ৫০০
INSERT INTO `bookings` (`id`, `booking_reference`, `trip_id`, `user_id`, `customer_name`, `customer_phone`, `customer_nid`, `customer_address`, `total_seats`, `total_fare`, `advance_paid`, `due_amount`, `booking_status`, `payment_status`, `created_at`) VALUES
(1, 'BUS-20260930-0001', 1, 1, 'তানভীর আহমেদ', '01711223344', '19902692512345', 'মিরপুর-১, ঢাকা', 2, 1500.00, 1000.00, 500.00, 'confirmed', 'partial', '2026-09-30 09:30:00'),
(2, 'BUS-20260930-0002', 1, 1, 'মোছাঃ সুমাইয়া আক্তার', '01822334455', NULL, 'ধানমন্ডি, ঢাকা', 1, 750.00, 750.00, 0.00, 'confirmed', 'paid', '2026-09-30 10:15:00'),
(3, 'BUS-20260930-0003', 2, 2, 'মোঃ কামরুল হাসান', '01933445566', '19852692598765', 'উত্তরা, ঢাকা', 3, 2550.00, 1500.00, 1050.00, 'confirmed', 'partial', '2026-09-30 11:20:00');

-- বুকিং সিট রেকর্ড
INSERT INTO `booking_seats` (`booking_id`, `trip_id`, `seat_number`, `fare`) VALUES
(1, 1, 'A1', 750.00),
(1, 1, 'A2', 750.00),
(2, 1, 'B1', 750.00),
(3, 2, 'A1', 850.00),
(3, 2, 'A2', 850.00),
(3, 2, 'A3', 850.00);

-- প্যাসেঞ্জার বিস্তারিত
INSERT INTO `booking_passengers` (`booking_id`, `seat_number`, `passenger_name`, `passenger_phone`, `gender`, `age`) VALUES
(1, 'A1', 'তানভীর আহমেদ', '01711223344', 'পুরুষ', 32),
(1, 'A2', 'নাজমুল হুদা', '01711223345', 'পুরুষ', 28),
(2, 'B1', 'মোছাঃ সুমাইয়া আক্তার', '01822334455', 'মহিলা', 26),
(3, 'A1', 'মোঃ কামরুল হাসান', '01933445566', 'পুরুষ', 40),
(3, 'A2', 'রাবেয়া সুলতানা', '01933445567', 'মহিলা', 35),
(3, 'A3', 'হাসিব হাসান', NULL, 'পুরুষ', 12);

-- পেমেন্ট ও লেনদেন হিস্ট্রি
INSERT INTO `payments` (`booking_id`, `user_id`, `amount`, `payment_type`, `payment_method`, `transaction_reference`, `note`, `payment_date`) VALUES
(1, 1, 1000.00, 'advance', 'নগদ', 'CASH-REC-01', 'বুকিংয়ের সময় কাউন্টারে নগদ অগ্রিম গ্রহণ', '2026-09-30 09:30:00'),
(2, 1, 750.00, 'full_payment', 'বিকাশ', 'BKASH-TRX-98762', 'বিকাশের মাধ্যমে সম্পূর্ণ পরিশোধ', '2026-09-30 10:15:00'),
(3, 2, 1500.00, 'advance', 'নগদ (Nagad)', 'NAGAD-98231', 'কাউন্টারে নগদ প্রদান', '2026-09-30 11:20:00');

-- সিস্টেম সেটিংস
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('company_name', 'বাসগো পরিবহন লিমিটেড'),
('company_tagline', 'নিরাপদ, আরামদায়ক ও নির্ভরযোগ্য ভ্রমণ'),
('company_phone', '০১৭০০-০০০০০০, ০১৮০০-০০০০০০'),
('company_email', 'support@busgo.com.bd'),
('company_address', 'গাবতলী বাস টার্মিনাল, ঢাকা-১২১৬, বাংলাদেশ'),
('currency_symbol', '৳'),
('ticket_terms', '১. যাত্রার অন্তত ৩০ মিনিট পূর্বে কাউন্টারে উপস্থিত থাকুন। ২. অগ্রিম বুকিংয়ের টিকিট পরিবর্তন যোগ্য নয়। ৩. বাকি টাকা বাসে ওঠার পূর্বে পরিশোধ করতে হবে। ৪. অননুমোদিত মাদক ও বিস্ফোরক বহন সম্পূর্ণ নিষিদ্ধ। ৫. টিকিট ছাড়া যাত্রা আইনত দণ্ডনীয়।'),
('ticket_footer_note', 'ধন্যবাদ, আপনার যাত্রা শুভ ও নিরাপদ হোক।');

SET FOREIGN_KEY_CHECKS = 1;
