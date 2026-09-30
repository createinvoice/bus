<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * CSRF প্রটেকশন হ্যান্ডলার
 */

require_once __DIR__ . '/config.php';

function generate_csrf_token(): string {
    if (empty($_SESSION[CSRF_TOKEN_KEY])) {
        $_SESSION[CSRF_TOKEN_KEY] = bin2hex(random_bytes(32));
    }
    return $_SESSION[CSRF_TOKEN_KEY];
}

function csrf_token(): string {
    return generate_csrf_token();
}

function csrf_field(): string {
    $token = htmlspecialchars(generate_csrf_token(), ENT_QUOTES, 'UTF-8');
    return '<input type="hidden" name="csrf_token" value="' . $token . '">';
}

function verify_csrf_token(?string $token): bool {
    if (empty($_SESSION[CSRF_TOKEN_KEY]) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION[CSRF_TOKEN_KEY], $token);
}

function check_csrf(): void {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $token = $_POST['csrf_token'] ?? '';
        if (!verify_csrf_token($token)) {
            http_response_code(403);
            die('<div style="font-family:sans-serif; text-align:center; padding:50px;">
                <h3 style="color:#d9534f;">নিরাপত্তা ত্রুটি (CSRF Token Invalid)!</h3>
                <p>দয়া করে পৃষ্ঠাটি রিলোড দিয়ে পুনরায় চেষ্টা করুন।</p>
                <a href="javascript:history.back()">পূর্ববর্তী পৃষ্ঠায় ফিরে যান</a>
            </div>');
        }
    }
}
