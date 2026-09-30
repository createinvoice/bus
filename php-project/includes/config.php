<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * কনফিগারেশন ফাইল (Configuration File)
 */

// সরাসরি ব্রাউজার থেকে এই ফাইল এক্সেস বন্ধ রাখা
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'config.php') {
    http_response_code(403);
    exit('Access Denied');
}

// যে কোনো পিএইচপি এরর স্ক্রিনে প্রদর্শন নিশ্চিত করা (HTTP 500 এরর প্রতিরোধ ও সরাসরি সমস্যা দেখার জন্য)
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');

// সেশন কনফিগারেশন ও স্টার্ট (নিরাপদ মোড)
if (session_status() === PHP_SESSION_NONE) {
    @ini_set('session.cookie_httponly', '1');
    @ini_set('session.use_only_cookies', '1');
    @session_start();
}

// টাইমজোন সেট (বাংলাদেশ সময়)
date_default_timezone_set('Asia/Dhaka');

// ========================================================
// ডেটাবেস কনফিগারেশন: আপনার cPanel Database তথ্য দিন
// ========================================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'busgo_db');           // আপনার cPanel ডেটাবেস নাম
define('DB_USER', 'busgo_user');         // আপনার cPanel ডেটাবেস ইউজারনেম
define('DB_PASS', 'Secret@Password123'); // আপনার cPanel ডেটাবেস পাসওয়ার্ড
define('DB_CHARSET', 'utf8mb4');

// সিস্টেম তথ্য
define('APP_NAME', 'বাসগো - বাস রিজার্ভেশন সিস্টেম');
define('APP_VERSION', '1.0.0');
define('CURRENCY_SYMBOL', '৳');

// সাইট বেস ইউআরএল অটো-ডিটেক্ট
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || ($_SERVER['SERVER_PORT'] ?? 80) == 443) ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$script_name = $_SERVER['SCRIPT_NAME'] ?? '/index.php';
$script_dir = str_replace('\\', '/', dirname($script_name));

if (basename($script_dir) === 'admin') {
    $base_path = dirname($script_dir);
} else {
    $base_path = $script_dir;
}
$base_path = rtrim($base_path, '/');
define('BASE_URL', $protocol . $host . $base_path);
define('ADMIN_URL', BASE_URL . '/admin');

// সিকিউরিটি সল্ট
define('CSRF_TOKEN_KEY', 'busgo_csrf_token_secret_key');
