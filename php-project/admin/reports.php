<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * অ্যাডমিন রিপোর্ট ও অ্যানালিটিক্স পেজ (Comprehensive Admin Reports)
 */

$page_title = 'রিপোর্ট ও অ্যানালিটিক্স - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// ফিল্টার অপশনস
$start_date = $_GET['start_date'] ?? date('Y-m-d');
$end_date = $_GET['end_date'] ?? date('Y-m-d');
$filter_bus = (int)($_GET['bus_id'] ?? 0);
$filter_user = (int)($_GET['user_id'] ?? 0);
$filter_route = (int)($_GET['route_id'] ?? 0);
$filter_method = trim($_GET['payment_method'] ?? '');

$where = ["DATE(b.created_at) BETWEEN ? AND ?", "b.booking_status != 'cancelled'"];
$params = [$start_date, $end_date];

if ($filter_bus > 0) {
    $where[] = "t.bus_id = ?";
    $params[] = $filter_bus;
}
if ($filter_user > 0) {
    $where[] = "b.user_id = ?";
    $params[] = $filter_user;
}
if ($filter_route > 0) {
    $where[] = "t.route_id = ?";
    $params[] = $filter_route;
}

$where_sql = implode(" AND ", $where);

// সামগ্রিক রিপোর্ট ডেটা
$summary_stmt = $db->prepare("
    SELECT 
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(b.total_seats), 0) as total_passengers,
        COALESCE(SUM(b.total_fare), 0) as total_fare,
        COALESCE(SUM(b.advance_paid), 0) as total_advance,
        COALESCE(SUM(b.due_amount), 0) as total_due
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    WHERE $where_sql
");
$summary_stmt->execute($params);
$report_summary = $summary_stmt->fetch();

// নির্ধারিত রেঞ্জের প্রকৃত কালেকশন (Payments table)
$pay_params = [$start_date, $end_date];
$pay_where = ["DATE(p.payment_date) BETWEEN ? AND ?"];
if ($filter_user > 0) {
    $pay_where[] = "p.user_id = ?";
    $pay_params[] = $filter_user;
}
if (!empty($filter_method)) {
    $pay_where[] = "p.payment_method = ?";
    $pay_params[] = $filter_method;
}
$pay_where_sql = implode(" AND ", $pay_where);

$col_stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total_collected FROM payments p WHERE $pay_where_sql");
$col_stmt->execute($pay_params);
$total_collected = (float)$col_stmt->fetchColumn();

// বিস্তারিত রিপোর্ট তালিকা
$details_stmt = $db->prepare("
    SELECT 
        b.*, bus.name as bus_name, r.origin, r.destination, u.name as operator_name, t.journey_date, t.departure_time
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN buses bus ON t.bus_id = bus.id
    JOIN routes r ON t.route_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE $where_sql
    ORDER BY b.created_at DESC
");
$details_stmt->execute($params);
$report_rows = $details_stmt->fetchAll();

// ড্রপডাউন ডেটা
$buses = $db->query("SELECT id, name, bus_number FROM buses WHERE status = 'active'")->fetchAll();
$users = $db->query("SELECT id, name FROM users WHERE status = 'active'")->fetchAll();
$routes = $db->query("SELECT id, origin, destination FROM routes WHERE status = 'active'")->fetchAll();
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-file-earmark-bar-graph-fill text-primary me-2"></i>অ্যাডমিন সার্বিক রিপোর্ট
        </h4>
        <span class="text-muted small">তারিখ রেঞ্জ, বাস, অপারেটর ও রুট অনুযায়ী বিস্তারিত হিসাব ও ডাউনলোড</span>
    </div>
    <div class="no-print">
        <button onclick="window.print()" class="btn btn-outline-dark">
            <i class="bi bi-printer me-1"></i> রিপোর্ট প্রিন্ট করুন
        </button>
    </div>
</div>

<!-- ফিল্টার ফর্ম -->
<div class="card shadow-sm mb-4 border-0 no-print">
    <div class="card-body bg-white p-3 rounded">
        <form method="GET" action="" class="row g-2 align-items-center">
            <div class="col-md-2">
                <label class="form-label small fw-bold mb-0">শুরুর তারিখ</label>
                <input type="date" name="start_date" class="form-control form-control-sm" value="<?= htmlspecialchars($start_date) ?>" required>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-bold mb-0">শেষের তারিখ</label>
                <input type="date" name="end_date" class="form-control form-control-sm" value="<?= htmlspecialchars($end_date) ?>" required>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-bold mb-0">বাস</label>
                <select name="bus_id" class="form-select form-select-sm">
                    <option value="">সকল বাস</option>
                    <?php foreach ($buses as $b): ?>
                        <option value="<?= $b['id'] ?>" <?= $filter_bus == $b['id'] ? 'selected' : '' ?>><?= htmlspecialchars($b['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-bold mb-0">অপারেটর</label>
                <select name="user_id" class="form-select form-select-sm">
                    <option value="">সকল অপারেটর</option>
                    <?php foreach ($users as $u): ?>
                        <option value="<?= $u['id'] ?>" <?= $filter_user == $u['id'] ? 'selected' : '' ?>><?= htmlspecialchars($u['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-bold mb-0">রুট</label>
                <select name="route_id" class="form-select form-select-sm">
                    <option value="">সকল রুট</option>
                    <?php foreach ($routes as $rt): ?>
                        <option value="<?= $rt['id'] ?>" <?= $filter_route == $rt['id'] ? 'selected' : '' ?>><?= htmlspecialchars($rt['origin']) ?> → <?= htmlspecialchars($rt['destination']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2 d-flex align-items-end gap-1 mt-auto">
                <button type="submit" class="btn btn-primary btn-sm flex-grow-1">রিপোর্ট দেখুন</button>
                <a href="<?= BASE_URL ?>/admin/reports.php" class="btn btn-outline-secondary btn-sm">রিসেট</a>
            </div>
        </form>
    </div>
</div>

<!-- রিপোর্ট সামারি কার্ডস (Section 22: Total bookings, Total passengers, Total fare, Total advance, Total collection, Total due) -->
<div class="row g-3 mb-4">
    <div class="col-sm-6 col-lg-2">
        <div class="card p-3 shadow-sm border-0 bg-white">
            <span class="text-muted small">মোট বুকিং</span>
            <div class="fs-4 fw-bold text-dark font-monospace"><?= en2bn($report_summary['total_bookings']) ?>টি</div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-2">
        <div class="card p-3 shadow-sm border-0 bg-white">
            <span class="text-muted small">মোট যাত্রী</span>
            <div class="fs-4 fw-bold text-primary font-monospace"><?= en2bn($report_summary['total_passengers']) ?> জন</div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-2">
        <div class="card p-3 shadow-sm border-0 bg-white">
            <span class="text-muted small">মোট ভাড়া</span>
            <div class="fs-5 fw-bold text-dark font-monospace"><?= format_taka($report_summary['total_fare']) ?></div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-2">
        <div class="card p-3 shadow-sm border-0 bg-white">
            <span class="text-muted small">মোট অগ্রিম</span>
            <div class="fs-5 fw-bold text-info font-monospace"><?= format_taka($report_summary['total_advance']) ?></div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-2">
        <div class="card p-3 shadow-sm border-0 bg-white">
            <span class="text-muted small">মোট আদায়</span>
            <div class="fs-5 fw-bold text-success font-monospace"><?= format_taka($total_collected) ?></div>
        </div>
    </div>
    <div class="col-sm-6 col-lg-2">
        <div class="card p-3 shadow-sm border-0 bg-white">
            <span class="text-muted small">মোট বাকি টাকা</span>
            <div class="fs-5 fw-bold text-danger font-monospace"><?= format_taka($report_summary['total_due']) ?></div>
        </div>
    </div>
</div>

<!-- রিপোর্ট বিস্তারিত টেবিল -->
<div class="card shadow-sm">
    <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold text-dark">
            রিপোর্ট কালীন বুকিং রেকর্ডসমূহ (<?= format_bn_date($start_date) ?> হতে <?= format_bn_date($end_date) ?>)
        </span>
        <span class="badge bg-light text-dark border"><?= en2bn(count($report_rows)) ?>টি রেকর্ড</span>
    </div>
    <div class="card-body p-0">
        <?php if (empty($report_rows)): ?>
            <div class="p-4 text-center text-muted">এই ফিল্টারে কোনো তথ্য পাওয়া যায়নি।</div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light small">
                        <tr>
                            <th>বুকিং আইডি</th>
                            <th>যাত্রী ও মোবাইল</th>
                            <th>বাস ও রুট</th>
                            <th>যাত্রার সময়</th>
                            <th>সিট সংখ্যা</th>
                            <th class="text-end">মোট ভাড়া</th>
                            <th class="text-end">অগ্রিম আদায়</th>
                            <th class="text-end">বাকি</th>
                            <th class="text-center">স্ট্যাটাস</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($report_rows as $row): ?>
                            <tr>
                                <td>
                                    <a href="<?= BASE_URL ?>/booking-view.php?id=<?= $row['id'] ?>" class="fw-bold font-monospace text-decoration-none">
                                        <?= htmlspecialchars($row['booking_reference']) ?>
                                    </a>
                                </td>
                                <td>
                                    <div class="fw-semibold text-dark"><?= htmlspecialchars($row['customer_name']) ?></div>
                                    <span class="text-muted small"><?= htmlspecialchars($row['customer_phone']) ?></span>
                                </td>
                                <td>
                                    <div class="small fw-semibold"><?= htmlspecialchars($row['bus_name']) ?></div>
                                    <span class="text-muted small"><?= htmlspecialchars($row['origin']) ?> → <?= htmlspecialchars($row['destination']) ?></span>
                                </td>
                                <td>
                                    <div class="small"><?= format_bn_date($row['journey_date']) ?></div>
                                    <span class="text-muted small"><?= format_bn_time($row['departure_time']) ?></span>
                                </td>
                                <td class="font-monospace text-center"><?= en2bn($row['total_seats']) ?>টি</td>
                                <td class="text-end font-monospace"><?= format_taka($row['total_fare']) ?></td>
                                <td class="text-end font-monospace text-success fw-bold"><?= format_taka($row['advance_paid']) ?></td>
                                <td class="text-end font-monospace text-danger"><?= format_taka($row['due_amount']) ?></td>
                                <td class="text-center"><?= get_payment_status_badge($row['payment_status']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
