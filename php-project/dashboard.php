<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * রিজার্ভেশন অপারেটর ড্যাশবোর্ড (Reservation User Dashboard)
 */

$page_title = 'অপারেটর ড্যাশবোর্ড - বাসগো';
require_once __DIR__ . '/includes/header.php';
require_operator();

$user_id = current_user_id();
$db = get_db();
$today = date('Y-m-d');

// ১. অপারেটরের আজকের মোট বুকিং এবং যাত্রী সংখ্যা
$booking_stmt = $db->prepare("
    SELECT 
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.total_seats), 0) as total_passengers,
        COALESCE(SUM(b.total_fare), 0) as total_fare,
        COALESCE(SUM(b.advance_paid), 0) as total_advance,
        COALESCE(SUM(b.due_amount), 0) as total_due
    FROM bookings b
    WHERE b.user_id = ? 
    AND DATE(b.created_at) = ? 
    AND b.booking_status != 'cancelled'
");
$booking_stmt->execute([$user_id, $today]);
$today_stats = $booking_stmt->fetch();

// ২. অপারেটরের আজকের মোট নগদ/অনলাইন আদায় (Payments Table)
$payment_stmt = $db->prepare("
    SELECT COALESCE(SUM(amount), 0) as today_collection 
    FROM payments 
    WHERE user_id = ? 
    AND DATE(payment_date) = ?
");
$payment_stmt->execute([$user_id, $today]);
$today_collection = (float)$payment_stmt->fetchColumn();

// ৩. অপারেটরের জন্য নির্ধারিত/অ্যাসাইন করা বাসের তালিকা
$assigned_buses_stmt = $db->prepare("
    SELECT DISTINCT b.id, b.name, b.bus_number, b.bus_type, b.total_seats, b.company_name
    FROM user_bus_assignments uba
    JOIN buses b ON uba.bus_id = b.id
    WHERE uba.user_id = ? AND b.status = 'active'
");
$assigned_buses_stmt->execute([$user_id]);
$assigned_buses = $assigned_buses_stmt->fetchAll();

// ৪. অপারেটরের আজকের এবং আসন্ন ট্রিপ তালিকা
$assigned_trips_stmt = $db->prepare("
    SELECT 
        t.id as trip_id, t.journey_date, t.departure_time, t.boarding_point, t.dropping_point, t.seat_fare, t.status,
        b.name as bus_name, b.bus_number, b.bus_type,
        r.origin, r.destination,
        (SELECT COUNT(*) FROM booking_seats bs WHERE bs.trip_id = t.id) as booked_seats,
        b.total_seats
    FROM trips t
    JOIN buses b ON t.bus_id = b.id
    JOIN routes r ON t.route_id = r.id
    JOIN user_bus_assignments uba ON (uba.bus_id = b.id OR uba.trip_id = t.id)
    WHERE uba.user_id = ? 
    AND t.journey_date >= ?
    AND t.status = 'scheduled'
    ORDER BY t.journey_date ASC, t.departure_time ASC
    LIMIT 6
");
$assigned_trips_stmt->execute([$user_id, $today]);
$assigned_trips = $assigned_trips_stmt->fetchAll();

// ৫. অপারেটরের আজকের সর্বশেষ বুকিং তালিকা
$recent_bookings_stmt = $db->prepare("
    SELECT 
        b.id, b.booking_reference, b.customer_name, b.customer_phone, b.total_seats,
        b.total_fare, b.advance_paid, b.due_amount, b.booking_status, b.payment_status, b.created_at,
        bus.name as bus_name, r.origin, r.destination, t.journey_date, t.departure_time
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN buses bus ON t.bus_id = bus.id
    JOIN routes r ON t.route_id = r.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT 8
");
$recent_bookings_stmt->execute([$user_id]);
$recent_bookings = $recent_bookings_stmt->fetchAll();
?>

<div class="row align-items-center mb-4">
    <div class="col-md-8">
        <h3 class="fw-bold mb-1 text-dark">
            স্বাগতম, <?= htmlspecialchars(current_user_name()) ?>!
        </h3>
        <p class="text-muted mb-0">
            কাউন্টার: <strong class="text-dark"><?= htmlspecialchars($_SESSION['user_counter'] ?? 'সাধারণ') ?></strong> | 
            আজকের তারিখ: <strong><?= format_bn_date(date('Y-m-d')) ?></strong>
        </p>
    </div>
    <div class="col-md-4 text-md-end mt-3 mt-md-0">
        <a href="<?= BASE_URL ?>/new-booking.php" class="btn btn-success btn-lg shadow-sm">
            <i class="bi bi-plus-circle me-1"></i> নতুন টিকিট বুকিং করুন
        </a>
    </div>
</div>

<!-- ড্যাশবোর্ড সামারি কার্ডস -->
<div class="row g-3 mb-4">
    <!-- আজকের মোট বুকিং -->
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted small fw-medium">আজকের মোট বুকিং</div>
                    <div class="fs-3 fw-bold text-dark mt-1 font-monospace">
                        <?= en2bn($today_stats['total_bookings'] ?? 0) ?>টি
                    </div>
                    <div class="text-muted small mt-1">যাত্রী: <?= en2bn($today_stats['total_passengers'] ?? 0) ?> জন</div>
                </div>
                <div class="stat-icon bg-primary-subtle text-primary">
                    <i class="bi bi-ticket-perforated"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- আজকের মোট আদায় -->
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted small fw-medium">আজকের মোট আদায় (কালেকশন)</div>
                    <div class="fs-3 fw-bold text-success mt-1 font-monospace">
                        <?= format_taka($today_collection) ?>
                    </div>
                    <div class="text-muted small mt-1">নগদ ও ডিজিটাল পেমেন্ট</div>
                </div>
                <div class="stat-icon bg-success-subtle text-success">
                    <i class="bi bi-wallet2"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- আজকের মোট অগ্রিম -->
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted small fw-medium">আজকের অগ্রিম গ্রহণ</div>
                    <div class="fs-3 fw-bold text-info mt-1 font-monospace">
                        <?= format_taka($today_stats['total_advance'] ?? 0) ?>
                    </div>
                    <div class="text-muted small mt-1">বুকিংকালীন জমা</div>
                </div>
                <div class="stat-icon bg-info-subtle text-info">
                    <i class="bi bi-cash-coin"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- আজকের বাকি টাকা -->
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted small fw-medium">আজকের বাকি টাকা (Due)</div>
                    <div class="fs-3 fw-bold text-danger mt-1 font-monospace">
                        <?= format_taka($today_stats['total_due'] ?? 0) ?>
                    </div>
                    <div class="text-muted small mt-1">যাত্রার পূর্বে আদায়যোগ্য</div>
                </div>
                <div class="stat-icon bg-danger-subtle text-danger">
                    <i class="bi bi-clock-history"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row g-4">
    <!-- নির্ধারিত ট্রিপসমূহ -->
    <div class="col-lg-5">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <span class="text-dark fw-bold"><i class="bi bi-bus-front text-success me-2"></i>আমার নির্ধারিত বাস ও ট্রিপ</span>
                <span class="badge bg-light text-dark border"><?= en2bn(count($assigned_trips)) ?>টি ট্রিপ</span>
            </div>
            <div class="card-body p-0">
                <?php if (empty($assigned_trips)): ?>
                    <div class="p-4 text-center text-muted">
                        <i class="bi bi-info-circle fs-3 d-block mb-2 text-secondary"></i>
                        বর্তমানে আপনার জন্য কোনো ট্রিপ বা বাস বরাদ্দ করা নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।
                    </div>
                <?php else: ?>
                    <div class="list-group list-group-flush">
                        <?php foreach ($assigned_trips as $t): 
                            $available = $t['total_seats'] - $t['booked_seats'];
                        ?>
                            <div class="list-group-item p-3">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <h6 class="fw-bold mb-0 text-dark"><?= htmlspecialchars($t['bus_name']) ?></h6>
                                        <span class="text-muted small"><?= htmlspecialchars($t['bus_number']) ?> (<?= get_bus_type_bn($t['bus_type']) ?>)</span>
                                    </div>
                                    <span class="badge bg-primary-subtle text-primary">
                                        <?= format_taka($t['seat_fare']) ?>/সিট
                                    </span>
                                </div>
                                <div class="small text-secondary mb-2">
                                    <i class="bi bi-geo-alt-fill text-danger me-1"></i>
                                    <strong><?= htmlspecialchars($t['origin']) ?></strong> হতে <strong><?= htmlspecialchars($t['destination']) ?></strong>
                                </div>
                                <div class="d-flex justify-content-between align-items-center small">
                                    <div class="text-muted">
                                        <i class="bi bi-clock me-1"></i><?= format_bn_date($t['journey_date']) ?>, <?= format_bn_time($t['departure_time']) ?>
                                    </div>
                                    <div>
                                        <span class="badge <?= $available > 0 ? 'bg-success' : 'bg-danger' ?>">
                                            খালি সিট: <?= en2bn($available) ?>টি
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-3 text-end">
                                    <a href="<?= BASE_URL ?>/new-booking.php?trip_id=<?= $t['trip_id'] ?>" class="btn btn-outline-success btn-sm">
                                        <i class="bi bi-cursor-fill me-1"></i> সিট বুক করুন
                                    </a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- সর্বশেষ বুকিং তালিকা -->
    <div class="col-lg-7">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <span class="text-dark fw-bold"><i class="bi bi-clock-history text-primary me-2"></i>আমার সাম্প্রতিক বুকিং</span>
                <a href="<?= BASE_URL ?>/bookings.php" class="btn btn-sm btn-outline-secondary">সকল বুকিং দেখুন</a>
            </div>
            <div class="card-body p-0">
                <?php if (empty($recent_bookings)): ?>
                    <div class="p-4 text-center text-muted">
                        <i class="bi bi-ticket-perforated fs-3 d-block mb-2 text-secondary"></i>
                        এখনো কোনো বুকিং সম্পন্ন হয়নি।
                    </div>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light small">
                                <tr>
                                    <th>বুকিং আইডি</th>
                                    <th>যাত্রী ও মোবাইল</th>
                                    <th>রুট ও সময়</th>
                                    <th class="text-end">মোট ভাড়া</th>
                                    <th class="text-end">অগ্রিম / বাকি</th>
                                    <th class="text-center">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($recent_bookings as $b): ?>
                                    <tr>
                                        <td>
                                            <a href="<?= BASE_URL ?>/booking-view.php?id=<?= $b['id'] ?>" class="fw-bold text-decoration-none font-monospace">
                                                <?= htmlspecialchars($b['booking_reference']) ?>
                                            </a>
                                            <div class="text-muted" style="font-size: 0.75rem;">
                                                সিট: <?= en2bn($b['total_seats']) ?>টি
                                            </div>
                                        </td>
                                        <td>
                                            <div class="fw-semibold text-dark"><?= htmlspecialchars($b['customer_name']) ?></div>
                                            <div class="text-muted small"><?= htmlspecialchars($b['customer_phone']) ?></div>
                                        </td>
                                        <td>
                                            <div class="small fw-semibold"><?= htmlspecialchars($b['origin']) ?> → <?= htmlspecialchars($b['destination']) ?></div>
                                            <div class="text-muted" style="font-size: 0.75rem;">
                                                <?= format_bn_date($b['journey_date']) ?>
                                            </div>
                                        </td>
                                        <td class="text-end font-monospace">
                                            <?= format_taka($b['total_fare']) ?>
                                        </td>
                                        <td class="text-end font-monospace">
                                            <div class="text-success small">অগ্রিম: <?= format_taka($b['advance_paid']) ?></div>
                                            <?php if ($b['due_amount'] > 0): ?>
                                                <div class="text-danger small fw-bold">বাকি: <?= format_taka($b['due_amount']) ?></div>
                                            <?php else: ?>
                                                <span class="badge bg-success-subtle text-success" style="font-size:0.7rem;">পরিশোধিত</span>
                                            <?php endif; ?>
                                        </td>
                                        <td class="text-center">
                                            <div class="btn-group btn-group-sm">
                                                <a href="<?= BASE_URL ?>/ticket.php?id=<?= $b['id'] ?>" target="_blank" class="btn btn-outline-dark" title="টিকিট প্রিন্ট">
                                                    <i class="bi bi-printer"></i>
                                                </a>
                                                <a href="<?= BASE_URL ?>/booking-view.php?id=<?= $b['id'] ?>" class="btn btn-outline-primary" title="বিস্তারিত">
                                                    <i class="bi bi-eye"></i>
                                                </a>
                                            </div>
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
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
