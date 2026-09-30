<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * লগআউট হ্যান্ডলার (Logout Handler)
 */

require_once __DIR__ . '/includes/config.php';

// সেশন আনসেট ও ধ্বংস
$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

session_destroy();

header('Location: ' . BASE_URL . '/login.php');
exit;
