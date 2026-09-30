<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ইনডেক্স পেজ (Entry Point)
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

$includes_dir = __DIR__ . '/includes';

if (file_exists($includes_dir . '/config.php')) {
    require_once $includes_dir . '/config.php';
}

if (file_exists($includes_dir . '/auth.php')) {
    require_once $includes_dir . '/auth.php';
}

if (function_exists('is_logged_in') && is_logged_in()) {
    if (function_exists('is_admin') && is_admin()) {
        header('Location: ' . (defined('BASE_URL') ? BASE_URL : '') . '/admin/index.php');
        exit;
    } else {
        header('Location: ' . (defined('BASE_URL') ? BASE_URL : '') . '/dashboard.php');
        exit;
    }
} else {
    // সরাসরি লগইন পেজে রিডাইরেক্ট
    header('Location: login.php');
    exit;
}
