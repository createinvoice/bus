<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * বুকিং বিস্তারিত পেজ (Booking Details, Payments & Cancel)
 */

$page_title = 'বুকিং বিস্তারিত - বাসগো';
require_once __DIR__ . '/includes/header.php';
require_login();

$booking_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$user_id = current_user_id();
$admin_mode = is_admin();
$db = get_db();

if ($booking_id <= 0 || !can_access_booking($booking_id, $user_id, $admin_mode)) {
    set_flash('danger', 'বুকিংটি খুঁজে পাওয়া যায়নি অথবা দেখার অনুমতি নেই!');
    header('Location: ' . BASE_URL . '/bookings.php');
    exit;
}

// বুকিং তথ্য লোড
$b_stmt = $db->prepare("
    SELECT 
        b.*, 
        bus.name as bus_name, bus.bus_number, bus.bus_type, bus.company_name,
        r.origin, r.destination,
        t.journey_date, t.departure_time, t.boarding_point, t.dropping_point, t.seat_fare,
        u.name as operator_name, u.counter_name
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN buses bus ON t.bus_id = bus.id
    JOIN routes r ON t.route_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
");
$b_stmt->execute([$booking_id]);
$booking = $b_stmt->fetch();

if (!$booking) {
    set_flash('danger', 'বুকিং রেকর্ড পাওয়া যায়নি।');
    header('Location: ' . BASE_URL . '/bookings.php');
    exit;
}

// বুক করা সিট এবং যাত্রীদের তালিকা
$seat_stmt = $db->prepare("
    SELECT bs.seat_number, bs.fare, bp.passenger_name, bp.passenger_phone, bp.gender, bp.age
    FROM booking_seats bs
    LEFT JOIN booking_passengers bp ON bs.booking_id = bp.booking_id AND bs.seat_number = bp.seat_number
    WHERE bs.booking_id = ?
    ORDER BY bs.seat_number ASC
");
$seat_stmt->execute([$booking_id]);
$passengers = $seat_stmt->fetchAll();

// পেমেন্ট ও লেনদেন হিস্ট্রি লোড
$pay_stmt = $db->prepare("
    SELECT p.*, COALESCE(u.name, 'সিস্টেম') as receiver_name 
    FROM payments p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.booking_id = ?
    ORDER BY p.payment_date ASC
");
$pay_stmt->execute([$booking_id]);
$payments = $pay_stmt->fetchAll();

// বুকিং বাতিল করার হ্যান্ডলার (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'cancel_booking') {
    check_csrf();
    $reason = trim($_POST['cancel_reason'] ?? 'যাত্রীর অনুরোধে বাতিল');

    if ($booking['booking_status'] === 'cancelled') {
        set_flash('warning', 'এই বুকিংটি ইতিমধ্যে বাতিল করা হয়েছে।');
    } else {
        $db->beginTransaction();
        try {
            // ১. বুকিং স্ট্যাটাস পরিবর্তন
            $upd = $db->prepare("UPDATE bookings SET booking_status = 'cancelled', cancellation_reason = ? WHERE id = ?");
            $upd->execute([$reason, $booking_id]);

            // ২. সিট রিলিজ করা যাতে অন্য কেউ আবার বুক করতে পারে
            $del_seats = $db->prepare("DELETE FROM booking_seats WHERE booking_id = ?");
            $del_seats->execute([$booking_id]);

            $db->commit();
            set_flash('success', 'বুকিংটি সফলভাবে বাতিল করা হয়েছে এবং সিটগুলো আবার উন্মুক্ত করা হয়েছে।');
            header("Location: " . BASE_URL . "/booking-view.php?id=" . $booking_id);
            exit;
        } catch (Exception $e) {
            $db->rollBack();
            set_flash('danger', 'বুকিং বাতিল করতে ত্রুটি ঘটেছে: ' . $e->getMessage());
        }
    }
}
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            বুকিং বিবরণ: <span class="font-monospace text-primary"><?= htmlspecialchars($booking['booking_reference']) ?></span>
        </h4>
        <span class="text-muted small">
            তৈরির তারিখ: <?= format_bn_date($booking['created_at'], true) ?> | 
            কাউন্টার: <strong><?= htmlspecialchars($booking['counter_name']) ?></strong> (<?= htmlspecialchars($booking['operator_name']) ?>)
        </span>
    </div>
    <div class="d-flex gap-2">
        <a href="<?= BASE_URL ?>/ticket.php?id=<?= $booking['id'] ?>" target="_blank" class="btn btn-dark">
            <i class="bi bi-printer me-1"></i> টিকিট প্রিন্ট করুন
        </a>
        <?php if ($booking['due_amount'] > 0 && $booking['booking_status'] !== 'cancelled'): ?>
            <a href="<?= BASE_URL ?>/booking-payment.php?id=<?= $booking['id'] ?>" class="btn btn-success">
                <i class="bi bi-cash me-1"></i> বাকি টাকা গ্রহণ করুন
            </a>
        <?php endif; ?>
        <a href="<?= BASE_URL ?>/bookings.php" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left me-1"></i> পেছনে
        </a>
    </div>
</div>

<div class="row g-4">
    <!-- বাম কলাম: ট্রিপ ও যাত্রী বিবরণ -->
    <div class="col-lg-7">
        <!-- ট্রিপ ও বাসের তথ্য -->
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white py-3">
                <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-bus-front text-success me-2"></i>বাস ও ভ্রমণের তথ্য</h6>
            </div>
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-sm-6">
                        <span class="text-muted small d-block">বাসের নাম:</span>
                        <strong><?= htmlspecialchars($booking['bus_name']) ?></strong>
                        <div class="text-secondary small"><?= htmlspecialchars($booking['bus_number']) ?> (<?= get_bus_type_bn($booking['bus_type']) ?>)</div>
                    </div>
                    <div class="col-sm-6">
                        <span class="text-muted small d-block">পরিবহন কোম্পানি:</span>
                        <strong><?= htmlspecialchars($booking['company_name']) ?></strong>
                    </div>
                    <div class="col-sm-6">
                        <span class="text-muted small d-block">রুট:</span>
                        <strong class="text-primary"><?= htmlspecialchars($booking['origin']) ?> → <?= htmlspecialchars($booking['destination']) ?></strong>
                    </div>
                    <div class="col-sm-6">
                        <span class="text-muted small d-block">যাত্রার তারিখ ও সময়:</span>
                        <strong><?= format_bn_date($booking['journey_date']) ?>, <?= format_bn_time($booking['departure_time']) ?></strong>
                    </div>
                    <div class="col-sm-6">
                        <span class="text-muted small d-block">বোর্ডিং পয়েন্ট:</span>
                        <span><?= htmlspecialchars($booking['boarding_point']) ?></span>
                    </div>
                    <div class="col-sm-6">
                        <span class="text-muted small d-block">ড্রপিং পয়েন্ট:</span>
                        <span><?= htmlspecialchars($booking['dropping_point']) ?></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- সিট ও যাত্রীদের বিবরণ -->
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white py-3">
                <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-people text-primary me-2"></i>সিট ও যাত্রীদের তালিকা</h6>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light small">
                            <tr>
                                <th>সিট নম্বর</th>
                                <th>যাত্রীর নাম</th>
                                <th>মোবাইল নম্বর</th>
                                <th class="text-end">ভাড়া</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($passengers as $p): ?>
                                <tr>
                                    <td>
                                        <span class="badge bg-primary fs-6 font-monospace"><?= htmlspecialchars($p['seat_number']) ?></span>
                                    </td>
                                    <td class="fw-semibold">
                                        <?= htmlspecialchars($p['passenger_name']) ?>
                                    </td>
                                    <td>
                                        <?= htmlspecialchars($p['passenger_phone'] ?: '-') ?>
                                    </td>
                                    <td class="text-end font-monospace">
                                        <?= format_taka($p['fare']) ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- পেমেন্ট ও লেনদেন হিস্ট্রি -->
        <div class="card shadow-sm">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-clock-history text-info me-2"></i>পেমেন্ট ট্রানজ্যাকশন হিস্ট্রি</h6>
                <span class="badge bg-light text-dark border"><?= en2bn(count($payments)) ?>টি লেনদেন</span>
            </div>
            <div class="card-body p-0">
                <?php if (empty($payments)): ?>
                    <div class="p-3 text-center text-muted small">কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।</div>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover align-middle mb-0">
                            <thead class="table-light small">
                                <tr>
                                    <th>তারিখ ও সময়</th>
                                    <th>লেনদেনের ধরন</th>
                                    <th>পেমেন্ট মাধ্যম</th>
                                    <th>গ্রহণকারী</th>
                                    <th class="text-end">পরিমাণ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($payments as $pay): ?>
                                    <tr>
                                        <td class="small"><?= format_bn_date($pay['payment_date'], true) ?></td>
                                        <td>
                                            <?php if ($pay['payment_type'] === 'advance'): ?>
                                                <span class="badge bg-info-subtle text-info">অগ্রিম</span>
                                            <?php elseif ($pay['payment_type'] === 'due_collection'): ?>
                                                <span class="badge bg-success-subtle text-success">বাকি আদায়</span>
                                            <?php else: ?>
                                                <span class="badge bg-primary-subtle text-primary">সম্পূর্ণ পরিশোধ</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?= htmlspecialchars($pay['payment_method']) ?></td>
                                        <td class="small"><?= htmlspecialchars($pay['receiver_name']) ?></td>
                                        <td class="text-end fw-bold font-monospace text-success">
                                            <?= format_taka($pay['amount']) ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- ডান কলাম: পেমেন্ট সামারি ও বুকিং একশন -->
    <div class="col-lg-5">
        <!-- আর্থিক অবস্থা ও সামারি -->
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-dark text-white py-3">
                <h6 class="mb-0 fw-bold"><i class="bi bi-wallet2 me-2"></i>পেমেন্ট সামারি (Payment Summary)</h6>
            </div>
            <div class="card-body">
                <table class="table table-borderless mb-0">
                    <tr>
                        <td class="text-muted">মোট সিট সংখ্যা:</td>
                        <td class="text-end fw-bold"><?= en2bn($booking['total_seats']) ?>টি</td>
                    </tr>
                    <tr>
                        <td class="text-muted">প্রতি সিট ভাড়া:</td>
                        <td class="text-end font-monospace"><?= format_taka($booking['seat_fare']) ?></td>
                    </tr>
                    <tr class="border-top">
                        <td class="fs-5 fw-bold">মোট ভাড়া:</td>
                        <td class="fs-5 fw-bold text-end font-monospace"><?= format_taka($booking['total_fare']) ?></td>
                    </tr>
                    <tr>
                        <td class="text-success fw-bold">মোট প্রাপ্ত টাকা:</td>
                        <td class="text-success fs-5 fw-bold text-end font-monospace"><?= format_taka($booking['advance_paid']) ?></td>
                    </tr>
                    <tr class="border-top table-danger-subtle">
                        <td class="fs-5 fw-bold text-danger">অবশিষ্ট বাকি টাকা:</td>
                        <td class="fs-4 fw-bold text-danger text-end font-monospace"><?= format_taka($booking['due_amount']) ?></td>
                    </tr>
                </table>

                <div class="mt-3 pt-3 border-top d-flex justify-content-between align-items-center">
                    <div>
                        <span class="text-muted small d-block">বুকিং স্ট্যাটাস:</span>
                        <?= get_booking_status_badge($booking['booking_status']) ?>
                    </div>
                    <div class="text-end">
                        <span class="text-muted small d-block">পেমেন্ট অবস্থা:</span>
                        <?= get_payment_status_badge($booking['payment_status']) ?>
                    </div>
                </div>

                <?php if ($booking['due_amount'] > 0 && $booking['booking_status'] !== 'cancelled'): ?>
                    <div class="mt-4">
                        <a href="<?= BASE_URL ?>/booking-payment.php?id=<?= $booking['id'] ?>" class="btn btn-success btn-lg w-100 shadow-sm">
                            <i class="bi bi-cash-stack me-2"></i>বাকি টাকা আদায় করুন
                        </a>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- যোগাযোগ ও বুকিং বিস্তারিত -->
        <div class="card shadow-sm mb-4">
            <div class="card-header bg-white py-3">
                <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-telephone-inbound text-secondary me-2"></i>যাত্রীর যোগাযোগের তথ্য</h6>
            </div>
            <div class="card-body">
                <p class="mb-1"><strong>নাম:</strong> <?= htmlspecialchars($booking['customer_name']) ?></p>
                <p class="mb-1"><strong>মোবাইল:</strong> <a href="tel:<?= htmlspecialchars($booking['customer_phone']) ?>"><?= htmlspecialchars($booking['customer_phone']) ?></a></p>
                <p class="mb-1"><strong>জাতীয় পরিচয়পত্র (NID):</strong> <?= htmlspecialchars($booking['customer_nid'] ?: 'তথ্য নেই') ?></p>
                <p class="mb-0"><strong>ঠিকানা:</strong> <?= htmlspecialchars($booking['customer_address'] ?: 'তথ্য নেই') ?></p>
            </div>
        </div>

        <!-- বুকিং বাতিলকরণ প্যানেল -->
        <?php if ($booking['booking_status'] !== 'cancelled'): ?>
            <div class="card border-danger shadow-sm">
                <div class="card-header bg-danger text-white py-2">
                    <h6 class="mb-0 fw-bold small"><i class="bi bi-exclamation-triangle-fill me-1"></i>বুকিং বাতিলকরণ (Cancel Booking)</h6>
                </div>
                <div class="card-body">
                    <p class="small text-muted mb-3">
                        বুকিং বাতিল করলে সংরক্ষিত সিটগুলো পুনরায় অন্য যাত্রীদের জন্য উন্মুক্ত হয়ে যাবে।
                    </p>
                    <form method="POST" action="" onsubmit="return confirm('আপনি কি নিশ্চিত যে এই বুকিংটি বাতিল করতে চান? সংরক্ষিত সিটগুলো অন্য যাত্রীদের জন্য মুক্ত হয়ে যাবে!');">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="cancel_booking">
                        <div class="mb-2">
                            <input type="text" name="cancel_reason" class="form-control form-control-sm" placeholder="বাতিলের কারণ লিখুন (ঐচ্ছিক)">
                        </div>
                        <button type="submit" class="btn btn-outline-danger btn-sm w-100">
                            <i class="bi bi-trash3 me-1"></i> বুকিং বাতিল করুন
                        </button>
                    </form>
                </div>
            </div>
        <?php else: ?>
            <div class="alert alert-danger mb-0">
                <i class="bi bi-x-octagon-fill me-1"></i> <strong>এই বুকিংটি বাতিল করা হয়েছে।</strong>
                <?php if (!empty($booking['cancellation_reason'])): ?>
                    <div class="small mt-1">কারণ: <?= htmlspecialchars($booking['cancellation_reason']) ?></div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
