<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * অথেনটিকেশন ও অথোরাইজেশন হ্যান্ডলার (Auth & Access Control)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';

function is_logged_in(): bool {
    return !empty($_SESSION['user_id']) && !empty($_SESSION['user_role']);
}

function is_admin(): bool {
    return is_logged_in() && $_SESSION['user_role'] === 'admin';
}

function is_operator(): bool {
    return is_logged_in() && in_array($_SESSION['user_role'], ['operator', 'staff']);
}

function current_user_id(): int {
    return (int)($_SESSION['user_id'] ?? 0);
}

function current_user_name(): string {
    return $_SESSION['user_name'] ?? 'ব্যবহারকারী';
}

function current_user_role(): string {
    return $_SESSION['user_role'] ?? '';
}

function require_login(): void {
    if (!is_logged_in()) {
        header('Location: ' . BASE_URL . '/login.php');
        exit;
    }
}

function require_admin(): void {
    require_login();
    if (!is_admin()) {
        http_response_code(403);
        die('<div style="font-family:sans-serif; text-align:center; padding:50px;">
            <h2 style="color:#d9534f;">অননুমোদিত এক্সেস! (Unauthorized Access)</h2>
            <p>আপনার এই পৃষ্ঠায় প্রবেশ করার অধিকার নেই। শুধুমাত্র সুপার অ্যাডমিন এটি পরিচালনা করতে পারেন।</p>
            <a href="' . BASE_URL . '/dashboard.php">অপারেটর ড্যাশবোর্ডে ফিরে যান</a>
        </div>');
    }
}

function require_operator(): void {
    require_login();
    // অ্যাডমিন বা অপারেটর উভয়েই বুকিং ইন্টারফেসে কাজ করতে পারে
    if (!is_admin() && !is_operator()) {
        header('Location: ' . BASE_URL . '/login.php');
        exit;
    }
}

/**
 * একজন অপারেটর কোনো নির্দিষ্ট ট্রিপ এক্সেস করার অনুমতি পায় কিনা পরীক্ষা
 * অ্যাডমিন হলে সব ট্রিপ এক্সেস পাবে
 * অপারেটর হলে শুধুমাত্র assigned bus/trip পাবে
 */
function can_access_trip(int $trip_id, int $user_id, bool $is_admin = false): bool {
    if ($is_admin) return true;

    $db = get_db();
    // ট্রিপটি কোন বাসের সাথে সম্পর্কিত তা বের করা
    $stmt = $db->prepare("SELECT bus_id FROM trips WHERE id = ?");
    $stmt->execute([$trip_id]);
    $trip = $stmt->fetch();
    if (!$trip) return false;

    $bus_id = (int)$trip['bus_id'];

    // চেক করা ইউজার সরাসরি এই ট্রিপে অথবা এই বাসে অ্যাসাইন করা আছে কিনা
    $assign_check = $db->prepare("
        SELECT id FROM user_bus_assignments 
        WHERE user_id = ? 
        AND (bus_id = ? OR trip_id = ?)
    ");
    $assign_check->execute([$user_id, $bus_id, $trip_id]);
    return (bool)$assign_check->fetch();
}

/**
 * একজন অপারেটর কোনো বুকিং দেখার/ম্যানেজ করার অনুমতি পায় কিনা পরীক্ষা
 */
function can_access_booking(int $booking_id, int $user_id, bool $is_admin = false): bool {
    if ($is_admin) return true;

    $db = get_db();
    $stmt = $db->prepare("SELECT id, user_id, trip_id FROM bookings WHERE id = ?");
    $stmt->execute([$booking_id]);
    $booking = $stmt->fetch();
    if (!$booking) return false;

    // যদি ইউজার নিজের তৈরি করা বুকিং হয়
    if ((int)$booking['user_id'] === $user_id) {
        return true;
    }

    // অথবা তার অ্যাসাইন করা বাসের ট্রিপের বুকিং হয়
    return can_access_trip((int)$booking['trip_id'], $user_id, false);
}
