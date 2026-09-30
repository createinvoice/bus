<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * টিকিট প্রিন্ট পেজ (Professional Ticket & Thermal POS Receipt)
 */

require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/auth.php';

require_login();

$booking_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$user_id = current_user_id();
$admin_mode = is_admin();
$db = get_db();

if ($booking_id <= 0 || !can_access_booking($booking_id, $user_id, $admin_mode)) {
    die('<div style="text-align:center; padding:50px; font-family:sans-serif;"><h3>অননুমোদিত টিকিট অথবা বুকিং পাওয়া যায়নি!</h3></div>');
}

// বুকিং তথ্য লোড
$stmt = $db->prepare("
    SELECT 
        b.*, 
        bus.name as bus_name, bus.bus_number, bus.bus_type, bus.company_name,
        r.origin, r.destination,
        t.journey_date, t.departure_time, t.boarding_point, t.dropping_point, t.seat_fare,
        u.name as operator_name, u.counter_name, u.phone as counter_phone
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN buses bus ON t.bus_id = bus.id
    JOIN routes r ON t.route_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
");
$stmt->execute([$booking_id]);
$booking = $stmt->fetch();

if (!$booking) {
    die('বুকিং রেকর্ড পাওয়া যায়নি।');
}

// সিট এবং যাত্রীদের তালিকা
$seat_stmt = $db->prepare("
    SELECT bs.seat_number, bp.passenger_name, bp.passenger_phone
    FROM booking_seats bs
    LEFT JOIN booking_passengers bp ON bs.booking_id = bp.booking_id AND bs.seat_number = bp.seat_number
    WHERE bs.booking_id = ?
    ORDER BY bs.seat_number ASC
");
$seat_stmt->execute([$booking_id]);
$seats = $seat_stmt->fetchAll();
$seat_numbers_str = implode(', ', array_column($seats, 'seat_number'));

$company_name = get_setting('company_name', 'বাসগো পরিবহন লিমিটেড');
$company_tagline = get_setting('company_tagline', 'নিরাপদ, আরামদায়ক ও নির্ভরযোগ্য ভ্রমণ');
$company_phone = get_setting('company_phone', '০১৭০০-০০০০০০');
$ticket_terms = get_setting('ticket_terms', '১. যাত্রার অন্তত ৩০ মিনিট পূর্বে কাউন্টারে উপস্থিত থাকুন। ২. বাকি টাকা বাসে ওঠার পূর্বে পরিশোধ করতে হবে। ৩. মাদক ও অবৈধ সামগ্রী বহন সম্পূর্ণ নিষিদ্ধ।');
$footer_note = get_setting('ticket_footer_note', 'ধন্যবাদ, আপনার যাত্রা শুভ ও নিরাপদ হোক।');
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>টিকিট - <?= htmlspecialchars($booking['booking_reference']) ?></title>
    <!-- Google Fonts: Noto Sans Bengali -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <style>
        body {
            font-family: 'Noto Sans Bengali', sans-serif;
            background-color: #f1f5f9;
            color: #1e293b;
            padding: 20px 0;
        }
        .ticket-wrapper {
            max-width: 780px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.06);
            padding: 30px;
            position: relative;
        }
        .thermal-wrapper {
            max-width: 320px;
            margin: 20px auto 0;
            background: #fff;
            border: 1px dashed #94a3b8;
            padding: 15px;
            font-size: 12px;
            display: none;
        }
        .ticket-header {
            border-bottom: 2px dashed #94a3b8;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .ticket-badge {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 15px;
        }
        .qr-placeholder {
            width: 80px;
            height: 80px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            text-align: center;
        }
        @media print {
            body {
                background: #ffffff !important;
                padding: 0 !important;
            }
            .no-print {
                display: none !important;
            }
            .ticket-wrapper {
                border: 1px solid #000 !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                padding: 15px !important;
                max-width: 100% !important;
            }
        }
    </style>
</head>
<body>

<!-- প্রিন্ট কন্ট্রোল বার (প্রিন্টের সময় লুকায়িত থাকবে) -->
<div class="container text-center mb-4 no-print">
    <div class="d-inline-flex gap-2 p-2 bg-white rounded shadow-sm border">
        <button onclick="window.print()" class="btn btn-success fw-bold">
            <i class="bi bi-printer-fill me-1"></i> টিকিট প্রিন্ট করুন (Print Ticket)
        </button>
        <button onclick="toggleThermal()" id="toggleBtn" class="btn btn-outline-secondary">
            <i class="bi bi-receipt me-1"></i> থার্মাল স্লিপ ভিউ
        </button>
        <a href="<?= BASE_URL ?>/booking-view.php?id=<?= $booking['id'] ?>" class="btn btn-outline-dark">
            <i class="bi bi-arrow-left me-1"></i> বুকিং বিবরণ
        </a>
    </div>
</div>

<!-- A4 স্ট্যান্ডার্ড প্যাসেঞ্জার টিকিট ভিউ -->
<div class="ticket-wrapper" id="standardTicket">
    <!-- হেডার -->
    <div class="ticket-header d-flex justify-content-between align-items-center">
        <div>
            <h3 class="fw-bold text-success mb-0"><i class="bi bi-bus-front me-2"></i><?= htmlspecialchars($company_name) ?></h3>
            <div class="text-muted small"><?= htmlspecialchars($company_tagline) ?></div>
            <div class="text-secondary small mt-1">হেল্পলাইন: <?= htmlspecialchars($company_phone) ?></div>
        </div>
        <div class="text-end">
            <div class="badge bg-dark fs-6 font-monospace mb-1"><?= htmlspecialchars($booking['booking_reference']) ?></div>
            <div class="text-muted small">বুকিংয়ের তারিখ: <?= format_bn_date($booking['created_at'], true) ?></div>
            <div class="text-muted small">কাউন্টার: <strong><?= htmlspecialchars($booking['counter_name']) ?></strong></div>
        </div>
    </div>

    <!-- যাত্রীর তথ্য ও বাস বিবরণ -->
    <div class="row g-3 mb-4">
        <div class="col-6">
            <div class="ticket-badge h-100">
                <span class="text-muted small d-block">যাত্রীর নাম ও মোবাইল:</span>
                <strong class="fs-5 text-dark"><?= htmlspecialchars($booking['customer_name']) ?></strong>
                <div class="text-secondary fw-semibold mt-1">
                    <i class="bi bi-telephone-fill me-1"></i><?= htmlspecialchars($booking['customer_phone']) ?>
                </div>
                <?php if ($booking['customer_nid']): ?>
                    <div class="text-muted small">NID: <?= htmlspecialchars($booking['customer_nid']) ?></div>
                <?php endif; ?>
            </div>
        </div>
        <div class="col-6">
            <div class="ticket-badge h-100">
                <span class="text-muted small d-block">বাস ও রুট বিবরণ:</span>
                <strong class="fs-5 text-dark"><?= htmlspecialchars($booking['bus_name']) ?></strong>
                <div class="text-muted small"><?= htmlspecialchars($booking['bus_number']) ?> (<?= get_bus_type_bn($booking['bus_type']) ?>)</div>
                <div class="text-primary fw-bold mt-1">
                    <?= htmlspecialchars($booking['origin']) ?> → <?= htmlspecialchars($booking['destination']) ?>
                </div>
            </div>
        </div>
    </div>

    <!-- ভ্রমণ সময় ও স্থান -->
    <div class="table-responsive mb-4">
        <table class="table table-bordered align-middle mb-0">
            <thead class="table-light small">
                <tr>
                    <th>যাত্রার তারিখ</th>
                    <th>ছাড়ার সময়</th>
                    <th>বোর্ডিং পয়েন্ট</th>
                    <th>ড্রপিং পয়েন্ট</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="fw-bold"><?= format_bn_date($booking['journey_date']) ?></td>
                    <td class="fw-bold text-danger"><?= format_bn_time($booking['departure_time']) ?></td>
                    <td><?= htmlspecialchars($booking['boarding_point']) ?></td>
                    <td><?= htmlspecialchars($booking['dropping_point']) ?></td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- সিট ও ভাড়া হিসাব -->
    <div class="row g-3 mb-4">
        <div class="col-md-7">
            <div class="p-3 border rounded h-100">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="text-muted small">সংরক্ষিত সিট নম্বর:</span>
                    <span class="badge bg-success fs-6 font-monospace px-3 py-2"><?= htmlspecialchars($seat_numbers_str) ?></span>
                </div>
                <div class="text-muted small">মোট সিট সংখ্যা: <strong><?= en2bn($booking['total_seats']) ?>টি</strong></div>
                <div class="text-muted small">প্রতি সিট ভাড়া: <strong><?= format_taka($booking['seat_fare']) ?></strong></div>

                <?php if (count($seats) > 1): ?>
                    <div class="mt-2 pt-2 border-top small text-secondary">
                        <strong>যাত্রীদের তালিকা:</strong>
                        <ul class="mb-0 ps-3">
                            <?php foreach ($seats as $st): ?>
                                <li>সিট <?= $st['seat_number'] ?>: <?= htmlspecialchars($st['passenger_name']) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <div class="col-md-5">
            <div class="p-3 border rounded bg-light h-100">
                <table class="table table-borderless table-sm mb-0">
                    <tr>
                        <td class="text-muted">মোট ভাড়া:</td>
                        <td class="text-end fw-bold font-monospace"><?= format_taka($booking['total_fare']) ?></td>
                    </tr>
                    <tr>
                        <td class="text-success fw-bold">অগ্রিম জমা:</td>
                        <td class="text-end fw-bold text-success font-monospace"><?= format_taka($booking['advance_paid']) ?></td>
                    </tr>
                    <tr class="border-top">
                        <td class="text-danger fw-bold fs-6">বাকি টাকা (Due):</td>
                        <td class="text-end fw-bold text-danger fs-5 font-monospace"><?= format_taka($booking['due_amount']) ?></td>
                    </tr>
                    <tr>
                        <td class="text-muted small">পেমেন্ট অবস্থা:</td>
                        <td class="text-end"><?= get_payment_status_badge($booking['payment_status']) ?></td>
                    </tr>
                </table>
            </div>
        </div>
    </div>

    <!-- শর্তাবলী ও বারকোড/ফুটার -->
    <div class="border-top pt-3 mt-3">
        <div class="row align-items-center">
            <div class="col-8">
                <div class="small text-muted" style="font-size:0.75rem; line-height: 1.4;">
                    <strong>শর্তাবলী:</strong> <?= htmlspecialchars($ticket_terms) ?>
                </div>
            </div>
            <div class="col-4 text-end">
                <div class="border p-2 d-inline-block text-center rounded bg-light">
                    <i class="bi bi-qr-code fs-1"></i>
                    <div style="font-size: 0.65rem;" class="font-monospace text-muted mt-1"><?= htmlspecialchars($booking['booking_reference']) ?></div>
                </div>
            </div>
        </div>

        <div class="text-center mt-3 pt-2 border-top fw-bold text-success">
            <?= htmlspecialchars($footer_note) ?>
        </div>
    </div>
</div>

<!-- থার্মাল পিওএস স্লিপ ভিউ (Thermal 80mm Receipt) -->
<div class="thermal-wrapper text-center font-monospace" id="thermalTicket">
    <div class="fw-bold fs-6 mb-1"><?= htmlspecialchars($company_name) ?></div>
    <div style="font-size:10px;" class="mb-2"><?= htmlspecialchars($company_phone) ?></div>
    <div class="border-top border-bottom py-1 my-1 fw-bold">
        টিকিট নং: <?= htmlspecialchars($booking['booking_reference']) ?>
    </div>
    <div class="text-start my-2">
        <div>যাত্রী: <?= htmlspecialchars($booking['customer_name']) ?></div>
        <div>মোবাইল: <?= htmlspecialchars($booking['customer_phone']) ?></div>
        <div>তারিখ: <?= format_bn_date($booking['journey_date']) ?> (<?= format_bn_time($booking['departure_time']) ?>)</div>
        <div>বাস: <?= htmlspecialchars($booking['bus_name']) ?> (<?= htmlspecialchars($booking['bus_number']) ?>)</div>
        <div>রুট: <?= htmlspecialchars($booking['origin']) ?> → <?= htmlspecialchars($booking['destination']) ?></div>
        <div>সিট: <strong><?= htmlspecialchars($seat_numbers_str) ?></strong></div>
        <div class="border-top my-1"></div>
        <div class="d-flex justify-content-between">
            <span>মোট ভাড়া:</span>
            <span><?= format_taka($booking['total_fare']) ?></span>
        </div>
        <div class="d-flex justify-content-between text-success">
            <span>অগ্রিম প্রদান:</span>
            <span><?= format_taka($booking['advance_paid']) ?></span>
        </div>
        <div class="d-flex justify-content-between text-danger fw-bold">
            <span>বাকি টাকা:</span>
            <span><?= format_taka($booking['due_amount']) ?></span>
        </div>
    </div>
    <div class="border-top pt-2 mt-2" style="font-size: 10px;">
        <?= htmlspecialchars($footer_note) ?>
    </div>
</div>

<script>
function toggleThermal() {
    const std = document.getElementById('standardTicket');
    const thm = document.getElementById('thermalTicket');
    const btn = document.getElementById('toggleBtn');
    if (thm.style.display === 'block') {
        thm.style.display = 'none';
        std.style.display = 'block';
        btn.innerHTML = '<i class="bi bi-receipt me-1"></i> থার্মাল স্লিপ ভিউ';
    } else {
        thm.style.display = 'block';
        std.style.display = 'none';
        btn.innerHTML = '<i class="bi bi-file-earmark me-1"></i> রেগুলার A4 ভিউ';
    }
}
</script>

</body>
</html>
