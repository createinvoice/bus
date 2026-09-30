<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ট্রিপ যাত্রী তালিকা ও ওয়েবিল / মেনিফেস্ট পেজ (Passenger Manifest & Waybill)
 */

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/database.php';
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../includes/auth.php';

require_login();

$trip_id = isset($_GET['trip_id']) ? (int)$_GET['trip_id'] : 0;
$user_id = current_user_id();
$admin_mode = is_admin();
$db = get_db();

if ($trip_id <= 0 || !can_access_trip($trip_id, $user_id, $admin_mode)) {
    die('<div style="text-align:center; padding:50px; font-family:sans-serif;"><h3>অননুমোদিত এক্সেস অথবা ট্রিপ পাওয়া যায়নি!</h3></div>');
}

// ট্রিপ, বাস ও রুট লোড
$stmt = $db->prepare("
    SELECT t.*, b.name as bus_name, b.bus_number, b.bus_type, b.total_seats, b.company_name,
           r.origin, r.destination, r.distance_km
    FROM trips t
    JOIN buses b ON t.bus_id = b.id
    JOIN routes r ON t.route_id = r.id
    WHERE t.id = ?
");
$stmt->execute([$trip_id]);
$trip = $stmt->fetch();

if (!$trip) {
    die('ট্রিপ পাওয়া যায়নি।');
}

// এই ট্রিপের সমস্ত বুকিং ও প্যাসেঞ্জার লোড
$pass_stmt = $db->prepare("
    SELECT 
        bs.seat_number, bs.fare,
        bp.passenger_name, bp.passenger_phone, bp.gender,
        b.booking_reference, b.customer_name, b.customer_phone, b.boarding_point, b.dropping_point,
        b.advance_paid, b.due_amount, b.payment_status,
        u.name as counter_operator, u.counter_name
    FROM booking_seats bs
    JOIN bookings b ON bs.booking_id = b.id
    LEFT JOIN booking_passengers bp ON b.id = bp.booking_id AND bs.seat_number = bp.seat_number
    JOIN users u ON b.user_id = u.id
    WHERE bs.trip_id = ? AND b.booking_status != 'cancelled'
    ORDER BY bs.seat_number ASC
");
$pass_stmt->execute([$trip_id]);
$booked_passengers = $pass_stmt->fetchAll();

// বাসের সমস্ত সিটের তালিকা
$all_seats_stmt = $db->prepare("SELECT seat_number FROM bus_seats WHERE bus_id = ? ORDER BY seat_row ASC, seat_column ASC");
$all_seats_stmt->execute([$trip['bus_id']]);
$all_bus_seats = $all_seats_stmt->fetchAll(PDO::FETCH_COLUMN);

// ম্যাপ তৈরি: সিট নম্বর অনুযায়ী ডেটা
$seat_map = [];
foreach ($booked_passengers as $p) {
    $seat_map[$p['seat_number']] = $p;
}

$total_booked = count($booked_passengers);
$total_fare_coll = array_sum(array_column($booked_passengers, 'fare'));
$total_due_on_bus = 0;
// গণনা: প্রতি বুকিংয়ের মোট বকেয়া
$unique_bookings = [];
foreach ($booked_passengers as $p) {
    if (!isset($unique_bookings[$p['booking_reference']])) {
        $unique_bookings[$p['booking_reference']] = (float)$p['due_amount'];
        $total_due_on_bus += (float)$p['due_amount'];
    }
}

$company_name = get_setting('company_name', 'বাসগো পরিবহন লিমিটেড');
$company_phone = get_setting('company_phone', '০১৭০০-০০০০০০');
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>যাত্রী তালিকা ও ওয়েবিল - ট্রিপ #<?= $trip['id'] ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        body { font-family: 'Noto Sans Bengali', sans-serif; background: #fff; color: #1e293b; }
        .manifest-container { max-width: 960px; margin: 0 auto; padding: 25px; }
        @media print {
            .no-print { display: none !important; }
            .manifest-container { max-width: 100% !important; padding: 0 !important; }
            table { font-size: 11px !important; }
        }
    </style>
</head>
<body>

<div class="container text-center my-3 no-print">
    <div class="d-inline-flex gap-2 p-2 bg-light rounded border shadow-sm">
        <button onclick="window.print()" class="btn btn-success fw-bold">
            <i class="bi bi-printer-fill me-1"></i> ওয়েবিল প্রিন্ট করুন (Print Waybill)
        </button>
        <a href="<?= BASE_URL ?>/admin/trips.php" class="btn btn-outline-secondary">
            পেছনে যান
        </a>
    </div>
</div>

<div class="manifest-container">
    <!-- হেডার -->
    <div class="text-center border-bottom pb-3 mb-3">
        <h3 class="fw-bold text-success mb-0"><?= htmlspecialchars($company_name) ?></h3>
        <h5 class="fw-bold text-dark mt-1">যাত্রী তালিকা ও ট্রিপ ওয়েবিল (Passenger Waybill / Manifest)</h5>
        <div class="small text-muted">হেল্পলাইন: <?= htmlspecialchars($company_phone) ?></div>
    </div>

    <!-- ট্রিপ ও স্টাফ ইনফো বক্স -->
    <div class="row g-2 mb-3 small bg-light p-3 rounded border">
        <div class="col-sm-4">
            <div>বাসের নাম: <strong><?= htmlspecialchars($trip['bus_name']) ?></strong></div>
            <div>বাস নম্বর: <strong class="font-monospace"><?= htmlspecialchars($trip['bus_number']) ?></strong> (<?= htmlspecialchars($trip['bus_type']) ?>)</div>
        </div>
        <div class="col-sm-4">
            <div>রুট: <strong class="text-primary"><?= htmlspecialchars($trip['origin']) ?> হতে <?= htmlspecialchars($trip['destination']) ?></strong></div>
            <div>তারিখ ও সময়: <strong><?= format_bn_date($trip['journey_date']) ?>, <?= format_bn_time($trip['departure_time']) ?></strong></div>
        </div>
        <div class="col-sm-4">
            <div>চালক (Driver): <strong><?= htmlspecialchars($trip['driver_name'] ?: 'মোশাররফ হোসেন') ?></strong> (<?= htmlspecialchars($trip['driver_phone'] ?: '01712-112233') ?>)</div>
            <div>সুপারভাইজার: <strong><?= htmlspecialchars($trip['supervisor_name'] ?: 'মোঃ আলমগীর') ?></strong> (<?= htmlspecialchars($trip['supervisor_phone'] ?: '01819-445566') ?>)</div>
        </div>
    </div>

    <!-- প্যাসেঞ্জার মেনিফেস্ট টেবিল -->
    <div class="table-responsive mb-4">
        <table class="table table-bordered table-sm align-middle">
            <thead class="table-dark small text-center">
                <tr>
                    <th style="width: 8%;">সিট</th>
                    <th style="width: 20%;">যাত্রীর নাম</th>
                    <th style="width: 15%;">মোবাইল নম্বর</th>
                    <th style="width: 17%;">বোর্ডিং পয়েন্ট</th>
                    <th style="width: 17%;">ড্রপিং পয়েন্ট</th>
                    <th style="width: 11%;">টিকিট আইডি</th>
                    <th style="width: 12%;" class="text-end">বাকি আদায়</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($all_bus_seats as $st_code): 
                    $has_booked = isset($seat_map[$st_code]);
                    $row = $has_booked ? $seat_map[$st_code] : null;
                ?>
                    <tr class="<?= $has_booked ? '' : 'table-light text-muted' ?>">
                        <td class="text-center font-monospace fw-bold fs-6">
                            <?= htmlspecialchars($st_code) ?>
                        </td>
                        <td>
                            <?php if ($has_booked): ?>
                                <strong class="text-dark"><?= htmlspecialchars($row['passenger_name'] ?: $row['customer_name']) ?></strong>
                            <?php else: ?>
                                <span class="text-muted fst-italic">-- খালি আসন (Vacant) --</span>
                            <?php endif; ?>
                        </td>
                        <td class="font-monospace">
                            <?= $has_booked ? htmlspecialchars($row['passenger_phone'] ?: $row['customer_phone']) : '-' ?>
                        </td>
                        <td>
                            <?= $has_booked ? htmlspecialchars($row['boarding_point'] ?: $trip['boarding_point']) : '-' ?>
                        </td>
                        <td>
                            <?= $has_booked ? htmlspecialchars($row['dropping_point'] ?: $trip['dropping_point']) : '-' ?>
                        </td>
                        <td class="font-monospace small">
                            <?= $has_booked ? htmlspecialchars($row['booking_reference']) : '-' ?>
                        </td>
                        <td class="text-end font-monospace">
                            <?php if ($has_booked && (float)$row['due_amount'] > 0): ?>
                                <span class="badge bg-danger text-white"><?= format_taka($row['due_amount']) ?></span>
                            <?php elseif ($has_booked): ?>
                                <span class="badge bg-success-subtle text-success">পরিশোধিত</span>
                            <?php else: ?>
                                -
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <!-- সারসংক্ষেপ বক্স -->
    <div class="row g-3 mb-5 border-top pt-3">
        <div class="col-4">
            <div class="p-2 border rounded text-center">
                <span class="text-muted small d-block">মোট আসন সংখ্যা</span>
                <strong class="fs-5"><?= en2bn($trip['total_seats']) ?>টি</strong>
            </div>
        </div>
        <div class="col-4">
            <div class="p-2 border rounded text-center bg-light">
                <span class="text-muted small d-block">বুকড আসন সংখ্যা</span>
                <strong class="fs-5 text-success"><?= en2bn($total_booked) ?>টি</strong>
            </div>
        </div>
        <div class="col-4">
            <div class="p-2 border rounded text-center bg-danger-subtle">
                <span class="text-danger small d-block">বাসে মোট আদায়যোগ্য বাকি</span>
                <strong class="fs-5 text-danger font-monospace"><?= format_taka($total_due_on_bus) ?></strong>
            </div>
        </div>
    </div>

    <!-- সিগনেচার এরিয়া -->
    <div class="row text-center pt-4" style="margin-top: 40px;">
        <div class="col-4">
            <div class="border-top pt-2">
                <strong>কাউন্টার মাস্টারের স্বাক্ষর</strong>
            </div>
        </div>
        <div class="col-4">
            <div class="border-top pt-2">
                <strong>সুপারভাইজারের স্বাক্ষর</strong>
            </div>
        </div>
        <div class="col-4">
            <div class="border-top pt-2">
                <strong>চালকের (Driver) স্বাক্ষর</strong>
            </div>
        </div>
    </div>
</div>

</body>
</html>
