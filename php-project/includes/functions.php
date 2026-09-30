<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * সাধারণ হেল্পার ফাংশনসমূহ (Common Helper Functions)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';

// PHP 7 / 8 Compatibility Polyfills (হোস্টিংয়ে Fatal 500 প্রতিরোধ)
if (!function_exists('str_ends_with')) {
    function str_ends_with(string $haystack, string $needle): bool {
        $length = strlen($needle);
        return $length === 0 || (substr($haystack, -$length) === $needle);
    }
}
if (!function_exists('str_starts_with')) {
    function str_starts_with(string $haystack, string $needle): bool {
        return strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_contains')) {
    function str_contains(string $haystack, string $needle): bool {
        return $needle !== '' && mb_strpos($haystack, $needle) !== false;
    }
}

/**
 * ইংরেজি সংখ্যা বাংলায় রূপান্তর
 */
function en2bn($number): string {
    $bn_digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    $en_digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str_replace($en_digits, $bn_digits, (string)$number);
}

/**
 * বাংলা সংখ্যা ইংরেজিতে রূপান্তর
 */
function bn2en($number): string {
    $bn_digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    $en_digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return str_replace($bn_digits, $en_digits, (string)$number);
}

/**
 * টাকা ফরম্যাটিং (যেমন: ৳ ১,৫০০)
 */
function format_taka($amount): string {
    $formatted = number_format((float)$amount, 2);
    // যদি পয়সা .০০ হয় তবে পয়েন্ট বাদ দেওয়া যায়
    if (str_ends_with($formatted, '.00')) {
        $formatted = number_format((float)$amount, 0);
    }
    return CURRENCY_SYMBOL . ' ' . en2bn($formatted);
}

/**
 * বাংলা ফরম্যাটে তারিখ ও সময় প্রদর্শন
 */
function format_bn_date(?string $datetime_str, bool $with_time = false): string {
    if (!$datetime_str || $datetime_str === '0000-00-00 00:00:00') {
        return '-';
    }

    $months = [
        'January' => 'জানুয়ারি', 'February' => 'ফেব্রুয়ারি', 'March' => 'মার্চ',
        'April' => 'এপ্রিল', 'May' => 'মে', 'June' => 'জুন',
        'July' => 'জুলাই', 'August' => 'আগস্ট', 'September' => 'সেপ্টেম্বর',
        'October' => 'অক্টোবর', 'November' => 'নভেম্বর', 'December' => 'ডিসেম্বর'
    ];

    $timestamp = strtotime($datetime_str);
    $day = date('d', $timestamp);
    $month_en = date('F', $timestamp);
    $year = date('Y', $timestamp);
    $month_bn = $months[$month_en] ?? $month_en;

    $result = en2bn((int)$day) . ' ' . $month_bn . ' ' . en2bn($year);

    if ($with_time) {
        $time_format = date('h:i A', $timestamp);
        $time_format = str_replace(['AM', 'PM'], ['সকাল', 'রাত/বিকাল'], $time_format);
        $result .= ', ' . en2bn($time_format);
    }

    return $result;
}

/**
 * সময়কে বাংলায় দেখানো (যেমন: রাত ১০:০০ টা)
 */
function format_bn_time(?string $time_str): string {
    if (!$time_str) return '-';
    $timestamp = strtotime($time_str);
    $hour = (int)date('H', $timestamp);
    $period = 'সকাল';
    if ($hour >= 12 && $hour < 16) {
        $period = 'দুপুর';
    } elseif ($hour >= 16 && $hour < 19) {
        $period = 'বিকাল';
    } elseif ($hour >= 19 || $hour < 4) {
        $period = 'রাত';
    } elseif ($hour >= 4 && $hour < 6) {
        $period = 'ভোর';
    }

    $time_formatted = date('h:i', $timestamp);
    return $period . ' ' . en2bn($time_formatted) . ' টা';
}

/**
 * নিরাপদ ইনপুট স্যানিটাইজার
 */
function clean($data): string {
    if (is_array($data)) return '';
    return htmlspecialchars(trim((string)$data), ENT_QUOTES, 'UTF-8');
}

/**
 * ইউনিক বুকিং রেফারেন্স আইডি জেনারেটর (Format: BUS-YYYYMMDD-XXXX)
 */
function generate_booking_reference(PDO $db): string {
    $today = date('Ymd');
    $prefix = "BUS-{$today}-";

    $stmt = $db->prepare("SELECT COUNT(*) FROM bookings WHERE booking_reference LIKE ?");
    $stmt->execute([$prefix . '%']);
    $count = (int)$stmt->fetchColumn() + 1;

    do {
        $candidate = $prefix . str_pad((string)$count, 4, '0', STR_PAD_LEFT);
        $check = $db->prepare("SELECT id FROM bookings WHERE booking_reference = ?");
        $check->execute([$candidate]);
        if (!$check->fetch()) {
            return $candidate;
        }
        $count++;
    } while (true);
}

/**
 * বুকিং স্ট্যাটাস ব্যাজ
 */
function get_booking_status_badge(string $status): string {
    switch ($status) {
        case 'confirmed':
            return '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">নিশ্চিত (Confirmed)</span>';
        case 'pending':
            return '<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">অপেক্ষমাণ (Pending)</span>';
        case 'cancelled':
            return '<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">বাতিল (Cancelled)</span>';
        case 'completed':
            return '<span class="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">সম্পন্ন (Completed)</span>';
        default:
            return '<span class="badge bg-secondary px-2 py-1">' . htmlspecialchars($status) . '</span>';
    }
}

/**
 * পেমেন্ট স্ট্যাটাস ব্যাজ
 */
function get_payment_status_badge(string $status): string {
    switch ($status) {
        case 'paid':
            return '<span class="badge bg-success text-white px-2 py-1">পরিশোধিত (Paid)</span>';
        case 'partial':
            return '<span class="badge bg-warning text-dark px-2 py-1">আংশিক বাকি (Partial)</span>';
        case 'unpaid':
            return '<span class="badge bg-danger text-white px-2 py-1">বাকি (Unpaid)</span>';
        case 'refunded':
            return '<span class="badge bg-secondary text-white px-2 py-1">রিফান্ড (Refunded)</span>';
        default:
            return '<span class="badge bg-light text-dark px-2 py-1">' . htmlspecialchars($status) . '</span>';
    }
}

/**
 * বাসের ধরন বাংলায়
 */
function get_bus_type_bn(string $type): string {
    switch ($type) {
        case 'AC': return 'এসি (AC)';
        case 'Non-AC': return 'নন-এসি (Non-AC)';
        case 'Deluxe': return 'ডিলাক্স (Deluxe)';
        case 'Sleeper': return 'স্লিপার (Sleeper)';
        default: return $type;
    }
}

/**
 * সেটিংস ভ্যালু পড়া
 */
function get_setting(string $key, string $default = ''): string {
    static $settings_cache = [];
    if (!empty($settings_cache)) {
        return $settings_cache[$key] ?? $default;
    }

    try {
        $db = get_db();
        $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
        while ($row = $stmt->fetch()) {
            $settings_cache[$row['setting_key']] = $row['setting_value'];
        }
        return $settings_cache[$key] ?? $default;
    } catch (Exception $e) {
        return $default;
    }
}

/**
 * ফ্ল্যাশ মেসেজ সেট করা
 */
function set_flash(string $type, string $message): void {
    $_SESSION['flash_message'] = [
        'type' => $type, // success, danger, warning, info
        'text' => $message
    ];
}

/**
 * ফ্ল্যাশ মেসেজ প্রদর্শন ও ক্লিয়ার করা
 */
function display_flash(): string {
    if (isset($_SESSION['flash_message'])) {
        $flash = $_SESSION['flash_message'];
        unset($_SESSION['flash_message']);
        $type = htmlspecialchars($flash['type']);
        $text = htmlspecialchars($flash['text']);
        return "<div class=\"alert alert-{$type} alert-dismissible fade show border-0 shadow-sm\" role=\"alert\">
            <span>{$text}</span>
            <button type=\"button\" class=\"btn-close\" data-bs-dismiss=\"alert\" aria-label=\"Close\"></button>
        </div>";
    }
    return '';
}
