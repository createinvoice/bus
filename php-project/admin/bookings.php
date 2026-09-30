<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * অ্যাডমিন সকল বুকিং ব্যবস্থাপনা পেজ (Admin Bookings Management)
 */

$page_title = 'সকল বুকিং রেকর্ড - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// সার্চ ও ফিল্টারিং
$search = trim($_GET['search'] ?? '');
$filter_date = trim($_GET['date'] ?? '');
$filter_bus = (int)($_GET['bus_id'] ?? 0);
$filter_status = trim($_GET['status'] ?? '');
$filter_payment = trim($_GET['payment'] ?? '');

$where_clauses = [];
$params = [];

if (!empty($search)) {
    $where_clauses[] = "(b.booking_reference LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ?)";
    $like = "%{$search}%";
    $params = array_merge($params, [$like, $like, $like]);
}

if (!empty($filter_date)) {
    $where_clauses[] = "DATE(b.created_at) = ?";
    $params[] = $filter_date;
}

if ($filter_bus > 0) {
    $where_clauses[] = "t.bus_id = ?";
    $params[] = $filter_bus;
}

if (!empty($filter_status)) {
    $where_clauses[] = "b.booking_status = ?";
    $params[] = $filter_status;
}

if (!empty($filter_payment)) {
    $where_clauses[] = "b.payment_status = ?";
    $params[] = $filter_payment;
}

$where_sql = !empty($where_clauses) ? "WHERE " . implode(" AND ", $where_clauses) : "";

$query = "
    SELECT 
        b.*, 
        bus.name as bus_name, bus.bus_number,
        r.origin, r.destination,
        t.journey_date, t.departure_time,
        u.name as operator_name, u.counter_name,
        GROUP_CONCAT(bs.seat_number ORDER BY bs.seat_number ASC SEPARATOR ', ') as seat_numbers
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN buses bus ON t.bus_id = bus.id
    JOIN routes r ON t.route_id = r.id
    JOIN users u ON b.user_id = u.id
    LEFT JOIN booking_seats bs ON b.id = bs.booking_id
    $where_sql
    GROUP BY b.id
    ORDER BY b.created_at DESC
";

$stmt = $db->prepare($query);
$stmt->execute($params);
$bookings = $stmt->fetchAll();

$buses = $db->query("SELECT id, name, bus_number FROM buses WHERE status = 'active'")->fetchAll();
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-ticket-perforated-fill text-primary me-2"></i>সকল বাস টিকিট ও বুকিং রেকর্ড
        </h4>
        <span class="text-muted small">সকল কাউন্টার ও বাসের সামগ্রিক বুকিং অনুসন্ধান ও পরিচালনা</span>
    </div>
    <div>
        <a href="<?= BASE_URL ?>/new-booking.php" class="btn btn-success">
            <i class="bi bi-plus-lg me-1"></i> নতুন বুকিং করুন
        </a>
    </div>
</div>

<!-- ফিল্টার ও অনুসন্ধান বার -->
<div class="card shadow-sm mb-4 border-0">
    <div class="card-body bg-white p-3 rounded">
        <form method="GET" action="" class="row g-2 align-items-center">
            <div class="col-md-3">
                <input type="text" name="search" class="form-control" placeholder="রেফারেন্স, নাম বা মোবাইল" value="<?= htmlspecialchars($search) ?>">
            </div>
            <div class="col-md-2">
                <select name="bus_id" class="form-select">
                    <option value="">সকল বাস</option>
                    <?php foreach ($buses as $bus): ?>
                        <option value="<?= $bus['id'] ?>" <?= $filter_bus == $bus['id'] ? 'selected' : '' ?>>
                            <?= htmlspecialchars($bus['name']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <input type="date" name="date" class="form-control" value="<?= htmlspecialchars($filter_date) ?>" title="তারিখ">
            </div>
            <div class="col-md-2">
                <select name="payment" class="form-select">
                    <option value="">পেমেন্ট অবস্থা</option>
                    <option value="paid" <?= $filter_payment === 'paid' ? 'selected' : '' ?>>পরিশোধিত</option>
                    <option value="partial" <?= $filter_payment === 'partial' ? 'selected' : '' ?>>আংশিক বাকি</option>
                    <option value="unpaid" <?= $filter_payment === 'unpaid' ? 'selected' : '' ?>>বাকি</option>
                </select>
            </div>
            <div class="col-md-3 d-flex gap-2">
                <button type="submit" class="btn btn-primary flex-grow-1">
                    <i class="bi bi-search me-1"></i> ফিল্টার
                </button>
                <a href="<?= BASE_URL ?>/admin/bookings.php" class="btn btn-outline-secondary">রিসেট</a>
            </div>
        </form>
    </div>
</div>

<div class="card shadow-sm">
    <div class="card-body p-0">
        <?php if (empty($bookings)): ?>
            <div class="p-5 text-center text-muted">
                <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                কোনো বুকিং রেকর্ড পাওয়া যায়নি।
            </div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-dark small">
                        <tr>
                            <th>বুকিং আইডি</th>
                            <th>যাত্রীর নাম ও ফোন</th>
                            <th>বাস ও রুট</th>
                            <th>তারিখ ও সময়</th>
                            <th>সিট নম্বর</th>
                            <th class="text-end">মোট ভাড়া</th>
                            <th class="text-end">আদায়কৃত</th>
                            <th class="text-end">বাকি</th>
                            <th class="text-center">স্ট্যাটাস</th>
                            <th class="text-center">অ্যাকশন</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($bookings as $b): ?>
                            <tr>
                                <td>
                                    <a href="<?= BASE_URL ?>/booking-view.php?id=<?= $b['id'] ?>" class="fw-bold font-monospace text-decoration-none">
                                        <?= htmlspecialchars($b['booking_reference']) ?>
                                    </a>
                                    <div class="text-muted" style="font-size:0.75rem;">
                                        কাউন্টার: <?= htmlspecialchars($b['counter_name']) ?> (<?= htmlspecialchars($b['operator_name']) ?>)
                                    </div>
                                </td>
                                <td>
                                    <div class="fw-semibold text-dark"><?= htmlspecialchars($b['customer_name']) ?></div>
                                    <span class="text-muted small"><i class="bi bi-telephone me-1"></i><?= htmlspecialchars($b['customer_phone']) ?></span>
                                </td>
                                <td>
                                    <div class="fw-semibold small"><?= htmlspecialchars($b['bus_name']) ?></div>
                                    <span class="text-muted small"><?= htmlspecialchars($b['origin']) ?> → <?= htmlspecialchars($b['destination']) ?></span>
                                </td>
                                <td>
                                    <div class="small fw-semibold"><?= format_bn_date($b['journey_date']) ?></div>
                                    <span class="text-muted small"><?= format_bn_time($b['departure_time']) ?></span>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark border font-monospace fw-bold">
                                        <?= htmlspecialchars($b['seat_numbers'] ?: '-') ?>
                                    </span>
                                </td>
                                <td class="text-end font-monospace"><?= format_taka($b['total_fare']) ?></td>
                                <td class="text-end font-monospace text-success fw-bold"><?= format_taka($b['advance_paid']) ?></td>
                                <td class="text-end font-monospace">
                                    <?php if ($b['due_amount'] > 0): ?>
                                        <span class="text-danger fw-bold"><?= format_taka($b['due_amount']) ?></span>
                                    <?php else: ?>
                                        <span class="text-muted">০</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-center">
                                    <div class="mb-1"><?= get_booking_status_badge($b['booking_status']) ?></div>
                                    <div><?= get_payment_status_badge($b['payment_status']) ?></div>
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>/ticket.php?id=<?= $b['id'] ?>" target="_blank" class="btn btn-outline-dark" title="প্রিন্ট টিকিট">
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

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
