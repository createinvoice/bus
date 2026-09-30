<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * সুপার অ্যাডমিন ড্যাশবোর্ড (Super Admin Dashboard)
 */

$page_title = 'সুপার অ্যাডমিন ড্যাশবোর্ড - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// ফিল্টার রেঞ্জ ("today", "yesterday", "this_week", "this_month", "custom")
$filter = $_GET['filter'] ?? 'today';
$start_date = '';
$end_date = '';

$today_date = date('Y-m-d');

switch ($filter) {
    case 'yesterday':
        $start_date = date('Y-m-d', strtotime('-1 day'));
        $end_date = $start_date;
        $filter_label = 'গতকাল (' . format_bn_date($start_date) . ')';
        break;
    case 'this_week':
        $start_date = date('Y-m-d', strtotime('monday this week'));
        $end_date = $today_date;
        $filter_label = 'এই সপ্তাহ (' . format_bn_date($start_date) . ' হতে ' . format_bn_date($end_date) . ')';
        break;
    case 'this_month':
        $start_date = date('Y-m-01');
        $end_date = $today_date;
        $filter_label = 'এই মাস (' . format_bn_date($start_date) . ' হতে ' . format_bn_date($end_date) . ')';
        break;
    case 'custom':
        $start_date = $_GET['start_date'] ?? $today_date;
        $end_date = $_GET['end_date'] ?? $today_date;
        $filter_label = 'কাস্টম রেঞ্জ (' . format_bn_date($start_date) . ' হতে ' . format_bn_date($end_date) . ')';
        break;
    case 'today':
    default:
        $start_date = $today_date;
        $end_date = $today_date;
        $filter_label = 'আজ (' . format_bn_date($today_date) . ')';
        break;
}

// ১. বুকিং ও প্যাসেঞ্জার পরিসংখ্যান (নির্ধারিত তারিখ অনুযায়ী)
$booking_stmt = $db->prepare("
    SELECT 
        COUNT(id) as total_bookings,
        COALESCE(SUM(total_seats), 0) as total_passengers,
        COALESCE(SUM(total_fare), 0) as total_fare,
        COALESCE(SUM(advance_paid), 0) as total_advance,
        COALESCE(SUM(due_amount), 0) as total_due
    FROM bookings
    WHERE DATE(created_at) BETWEEN ? AND ?
    AND booking_status != 'cancelled'
");
$booking_stmt->execute([$start_date, $end_date]);
$range_stats = $booking_stmt->fetch();

// ২. মোট প্রকৃত আদায় (Payments Table থেকে নির্ধারিত তারিখে গৃহীত টাকা)
$pay_stmt = $db->prepare("
    SELECT 
        COALESCE(SUM(amount), 0) as total_collected,
        COALESCE(SUM(CASE WHEN payment_type = 'advance' THEN amount ELSE 0 END), 0) as advance_collected,
        COALESCE(SUM(CASE WHEN payment_type = 'due_collection' THEN amount ELSE 0 END), 0) as due_collected,
        COALESCE(SUM(CASE WHEN payment_type = 'full_payment' THEN amount ELSE 0 END), 0) as full_collected
    FROM payments
    WHERE DATE(payment_date) BETWEEN ? AND ?
");
$pay_stmt->execute([$start_date, $end_date]);
$collection_stats = $pay_stmt->fetch();

// ৩. বাতিলকৃত বুকিং সংখ্যা
$cancel_stmt = $db->prepare("
    SELECT COUNT(*) FROM bookings 
    WHERE DATE(created_at) BETWEEN ? AND ? AND booking_status = 'cancelled'
");
$cancel_stmt->execute([$start_date, $end_date]);
$cancelled_bookings = (int)$cancel_stmt->fetchColumn();

// ৪. সক্রিয় বাস ও সক্রিয় ব্যবহারকারী
$active_buses = (int)$db->query("SELECT COUNT(*) FROM buses WHERE status = 'active'")->fetchColumn();
$active_users = (int)$db->query("SELECT COUNT(*) FROM users WHERE status = 'active'")->fetchColumn();

// ৫. বাস অনুযায়ী কালেকশন ও বুকিং
$bus_stmt = $db->prepare("
    SELECT 
        b.id, b.name as bus_name, b.bus_number, b.bus_type,
        COUNT(DISTINCT bk.id) as bookings_count,
        COALESCE(SUM(bk.total_seats), 0) as passengers_count,
        COALESCE(SUM(bk.total_fare), 0) as fare_total,
        COALESCE(SUM(bk.advance_paid), 0) as advance_total,
        COALESCE(SUM(bk.due_amount), 0) as due_total
    FROM buses b
    LEFT JOIN trips t ON b.id = t.bus_id
    LEFT JOIN bookings bk ON t.id = bk.trip_id AND (DATE(bk.created_at) BETWEEN ? AND ?) AND bk.booking_status != 'cancelled'
    GROUP BY b.id
    ORDER BY advance_total DESC
");
$bus_stmt->execute([$start_date, $end_date]);
$bus_stats = $bus_stmt->fetchAll();

// ৬. ইউজার / অপারেটর অনুযায়ী কালেকশন
$user_stmt = $db->prepare("
    SELECT 
        u.id, u.name, u.counter_name, u.phone,
        COUNT(DISTINCT bk.id) as bookings_count,
        COALESCE(SUM(bk.total_seats), 0) as passengers_count,
        COALESCE(SUM(p.amount), 0) as total_collection,
        COALESCE(SUM(bk.due_amount), 0) as total_due
    FROM users u
    LEFT JOIN bookings bk ON u.id = bk.user_id AND (DATE(bk.created_at) BETWEEN ? AND ?) AND bk.booking_status != 'cancelled'
    LEFT JOIN payments p ON u.id = p.user_id AND (DATE(p.payment_date) BETWEEN ? AND ?)
    GROUP BY u.id
    ORDER BY total_collection DESC
");
$user_stmt->execute([$start_date, $end_date, $start_date, $end_date]);
$user_stats = $user_stmt->fetchAll();

// ৭. রুট অনুযায়ী কালেকশন
$route_stmt = $db->prepare("
    SELECT 
        r.origin, r.destination,
        COUNT(DISTINCT bk.id) as bookings_count,
        COALESCE(SUM(bk.total_seats), 0) as passengers_count,
        COALESCE(SUM(bk.advance_paid), 0) as advance_total
    FROM routes r
    JOIN trips t ON r.id = t.route_id
    LEFT JOIN bookings bk ON t.id = bk.trip_id AND (DATE(bk.created_at) BETWEEN ? AND ?) AND bk.booking_status != 'cancelled'
    GROUP BY r.id
    ORDER BY advance_total DESC
");
$route_stmt->execute([$start_date, $end_date]);
$route_stats = $route_stmt->fetchAll();

// ৮. সর্বশেষ ৮টি বুকিং
$recent_stmt = $db->query("
    SELECT 
        b.*, bus.name as bus_name, r.origin, r.destination, u.name as operator_name, t.journey_date, t.departure_time
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN buses bus ON t.bus_id = bus.id
    JOIN routes r ON t.route_id = r.id
    JOIN users u ON b.user_id = u.id
    ORDER BY b.created_at DESC
    LIMIT 8
");
$recent_bookings = $recent_stmt->fetchAll();
?>

<!-- ড্যাশবোর্ড হেডার ও ডেট ফিল্টার -->
<div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
    <div>
        <h3 class="fw-bold mb-1 text-dark">
            <i class="bi bi-speedometer2 text-success me-2"></i>সুপার অ্যাডমিন কেন্দ্রীয় ড্যাশবোর্ড
        </h3>
        <p class="text-muted mb-0">
            বর্তমান ফিল্টার: <span class="badge bg-success-subtle text-success fs-6"><?= htmlspecialchars($filter_label) ?></span>
        </p>
    </div>

    <!-- ডেট ফিল্টার বার -->
    <div class="d-flex flex-wrap align-items-center gap-2">
        <div class="btn-group" role="group">
            <a href="?filter=today" class="btn btn-sm <?= $filter === 'today' ? 'btn-primary' : 'btn-outline-secondary' ?>">আজ</a>
            <a href="?filter=yesterday" class="btn btn-sm <?= $filter === 'yesterday' ? 'btn-primary' : 'btn-outline-secondary' ?>">গতকাল</a>
            <a href="?filter=this_week" class="btn btn-sm <?= $filter === 'this_week' ? 'btn-primary' : 'btn-outline-secondary' ?>">এই সপ্তাহ</a>
            <a href="?filter=this_month" class="btn btn-sm <?= $filter === 'this_month' ? 'btn-primary' : 'btn-outline-secondary' ?>">এই মাস</a>
        </div>

        <!-- কাস্টম ডেট পিকার ফর্ম -->
        <form method="GET" action="" class="d-flex align-items-center gap-1">
            <input type="hidden" name="filter" value="custom">
            <input type="date" name="start_date" class="form-control form-control-sm" value="<?= htmlspecialchars($start_date) ?>" required title="শুরুর তারিখ">
            <span class="text-muted">-</span>
            <input type="date" name="end_date" class="form-control form-control-sm" value="<?= htmlspecialchars($end_date) ?>" required title="শেষের তারিখ">
            <button type="submit" class="btn btn-sm btn-dark" title="ফিল্টার প্রয়োগ">
                <i class="bi bi-arrow-right"></i>
            </button>
        </form>
    </div>
</div>

<!-- বড় সামারি কার্ডস (Key Financial & Booking Metrics) -->
<div class="row g-3 mb-4">
    <!-- মোট আদায় / কালেকশন -->
    <div class="col-sm-6 col-xl-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted small fw-semibold">মোট আদায় (Total Collection)</div>
                    <div class="fs-3 fw-bold text-success mt-1 font-monospace">
                        <?= format_taka($collection_stats['total_collected']) ?>
                    </div>
                    <div class="text-muted small mt-1">
                        অগ্রিম: <?= format_taka($collection_stats['advance_collected']) ?> | বাকি আদায়: <?= format_taka($collection_stats['due_collected']) ?>
                    </div>
                </div>
                <div class="stat-icon bg-success-subtle text-success">
                    <i class="bi bi-cash-stack"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- মোট অগ্রিম বুকিং -->
    <div class="col-sm-6 col-xl-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted small fw-semibold">মোট অগ্রিম গ্রহণ (Advance)</div>
                    <div class="fs-3 fw-bold text-primary mt-1 font-monospace">
                        <?= format_taka($range_stats['total_advance']) ?>
                    </div>
                    <div class="text-muted small mt-1">
                        বুকিং সংখ্যা: <?= en2bn($range_stats['total_bookings']) ?>টি
                    </div>
                </div>
                <div class="stat-icon bg-primary-subtle text-primary">
                    <i class="bi bi-wallet2"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- অবশিষ্ট বাকি টাকা (Total Due) -->
    <div class="col-sm-6 col-xl-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted small fw-semibold">বাকি টাকা (Remaining Due)</div>
                    <div class="fs-3 fw-bold text-danger mt-1 font-monospace">
                        <?= format_taka($range_stats['total_due']) ?>
                    </div>
                    <div class="text-muted small mt-1">যাত্রীদের নিকট আদায়যোগ্য</div>
                </div>
                <div class="stat-icon bg-danger-subtle text-danger">
                    <i class="bi bi-hourglass-split"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- মোট যাত্রী ও বাস -->
    <div class="col-sm-6 col-xl-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-muted small fw-semibold">যাত্রী ও সক্রিয় বাস</div>
                    <div class="fs-3 fw-bold text-dark mt-1 font-monospace">
                        <?= en2bn($range_stats['total_passengers']) ?> জন
                    </div>
                    <div class="text-muted small mt-1">
                        বাস: <?= en2bn($active_buses) ?>টি | স্টাফ: <?= en2bn($active_users) ?> জন
                    </div>
                </div>
                <div class="stat-icon bg-info-subtle text-info">
                    <i class="bi bi-people-fill"></i>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ইউজার ও বাস অনুযায়ী কালেকশন টেবিল (Columns: User-wise & Bus-wise) -->
<div class="row g-4 mb-4">
    <!-- ইউজার/অপারেটর অনুযায়ী কালেকশন -->
    <div class="col-lg-6">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <span class="fw-bold text-dark"><i class="bi bi-person-check text-primary me-2"></i>অপারেটর অনুযায়ী আদায় (User-wise Collection)</span>
                <a href="<?= BASE_URL ?>/admin/payments.php" class="btn btn-sm btn-outline-secondary">বিস্তারিত</a>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light small">
                            <tr>
                                <th>অপারেটর ও কাউন্টার</th>
                                <th class="text-center">বুকিং</th>
                                <th class="text-center">যাত্রী</th>
                                <th class="text-end">মোট আদায়</th>
                                <th class="text-end">বাকি</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($user_stats)): ?>
                                <tr><td colspan="5" class="text-center text-muted p-3">কোনো তথ্য নেই।</td></tr>
                            <?php else: ?>
                                <?php foreach ($user_stats as $u): ?>
                                    <tr>
                                        <td>
                                            <div class="fw-semibold text-dark"><?= htmlspecialchars($u['name']) ?></div>
                                            <span class="text-muted small"><?= htmlspecialchars($u['counter_name']) ?></span>
                                        </td>
                                        <td class="text-center font-monospace"><?= en2bn($u['bookings_count']) ?></td>
                                        <td class="text-center font-monospace"><?= en2bn($u['passengers_count']) ?></td>
                                        <td class="text-end font-monospace fw-bold text-success">
                                            <?= format_taka($u['total_collection']) ?>
                                        </td>
                                        <td class="text-end font-monospace text-danger">
                                            <?= format_taka($u['total_due']) ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- বাস অনুযায়ী কালেকশন -->
    <div class="col-lg-6">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <span class="fw-bold text-dark"><i class="bi bi-bus-front text-success me-2"></i>বাস অনুযায়ী আদায় (Bus-wise Collection)</span>
                <a href="<?= BASE_URL ?>/admin/buses.php" class="btn btn-sm btn-outline-secondary">বাস তালিকা</a>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light small">
                            <tr>
                                <th>বাস ও নম্বর</th>
                                <th class="text-center">বুকিং</th>
                                <th class="text-end">মোট ভাড়া</th>
                                <th class="text-end">অগ্রিম আদায়</th>
                                <th class="text-end">বাকি</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($bus_stats)): ?>
                                <tr><td colspan="5" class="text-center text-muted p-3">কোনো তথ্য নেই।</td></tr>
                            <?php else: ?>
                                <?php foreach ($bus_stats as $bus): ?>
                                    <tr>
                                        <td>
                                            <div class="fw-semibold text-dark"><?= htmlspecialchars($bus['bus_name']) ?></div>
                                            <span class="text-muted small"><?= htmlspecialchars($bus['bus_number']) ?></span>
                                        </td>
                                        <td class="text-center font-monospace"><?= en2bn($bus['bookings_count']) ?></td>
                                        <td class="text-end font-monospace"><?= format_taka($bus['fare_total']) ?></td>
                                        <td class="text-end font-monospace fw-bold text-success">
                                            <?= format_taka($bus['advance_total']) ?>
                                        </td>
                                        <td class="text-end font-monospace text-danger">
                                            <?= format_taka($bus['due_total']) ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- রুট অনুযায়ী কালেকশন ও সাম্প্রতিক বুকিং -->
<div class="row g-4">
    <!-- রুট পরিসংখ্যান -->
    <div class="col-lg-4">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3">
                <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-signpost-2 text-info me-2"></i>রুট অনুযায়ী পারফরম্যান্স</h6>
            </div>
            <div class="card-body p-0">
                <ul class="list-group list-group-flush">
                    <?php foreach ($route_stats as $r): ?>
                        <li class="list-group-item d-flex justify-content-between align-items-center p-3">
                            <div>
                                <strong class="text-dark"><?= htmlspecialchars($r['origin']) ?> → <?= htmlspecialchars($r['destination']) ?></strong>
                                <div class="text-muted small">বুকিং: <?= en2bn($r['bookings_count']) ?>টি | যাত্রী: <?= en2bn($r['passengers_count']) ?> জন</div>
                            </div>
                            <span class="badge bg-primary-subtle text-primary fs-6 font-monospace">
                                <?= format_taka($r['advance_total']) ?>
                            </span>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
    </div>

    <!-- সাম্প্রতিক বুকিং টেবিল -->
    <div class="col-lg-8">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-ticket-detailed text-secondary me-2"></i>সর্বশেষ বুকিংসহ টিকেট</h6>
                <a href="<?= BASE_URL ?>/admin/bookings.php" class="btn btn-sm btn-outline-primary">সকল বুকিং দেখুন</a>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light small">
                            <tr>
                                <th>বুকিং আইডি</th>
                                <th>যাত্রীর নাম</th>
                                <th>বাস ও রুট</th>
                                <th class="text-end">মোট ভাড়া</th>
                                <th class="text-end">অগ্রিম / আদায়</th>
                                <th class="text-center">স্ট্যাটাস</th>
                                <th class="text-center">প্রিন্ট</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recent_bookings as $b): ?>
                                <tr>
                                    <td>
                                        <a href="<?= BASE_URL ?>/booking-view.php?id=<?= $b['id'] ?>" class="fw-bold font-monospace text-decoration-none">
                                            <?= htmlspecialchars($b['booking_reference']) ?>
                                        </a>
                                    </td>
                                    <td>
                                        <div class="fw-semibold text-dark"><?= htmlspecialchars($b['customer_name']) ?></div>
                                        <span class="text-muted small"><?= htmlspecialchars($b['customer_phone']) ?></span>
                                    </td>
                                    <td>
                                        <div class="small fw-semibold"><?= htmlspecialchars($b['bus_name']) ?></div>
                                        <span class="text-muted" style="font-size:0.75rem;"><?= htmlspecialchars($b['origin']) ?> → <?= htmlspecialchars($b['destination']) ?></span>
                                    </td>
                                    <td class="text-end font-monospace"><?= format_taka($b['total_fare']) ?></td>
                                    <td class="text-end font-monospace text-success"><?= format_taka($b['advance_paid']) ?></td>
                                    <td class="text-center">
                                        <?= get_payment_status_badge($b['payment_status']) ?>
                                    </td>
                                    <td class="text-center">
                                        <a href="<?= BASE_URL ?>/ticket.php?id=<?= $b['id'] ?>" target="_blank" class="btn btn-outline-dark btn-sm" title="প্রিন্ট টিকিট">
                                            <i class="bi bi-printer"></i>
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
