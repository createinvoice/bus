<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ট্রিপ খরচ ও লাভ-লোকসান হিসাব (Trip Expenses & Net Profit)
 */

$page_title = 'ট্রিপ খরচ ও আয়-ব্যয় - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// খরচ যোগ করা
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add_expense') {
    check_csrf();

    $trip_id = (int)($_POST['trip_id'] ?? 0);
    $category = trim($_POST['expense_category'] ?? 'ডিজেল / জ্বালানি');
    $amount = (float)($_POST['amount'] ?? 0);
    $note = trim($_POST['note'] ?? '');
    $date = trim($_POST['expense_date'] ?? date('Y-m-d'));

    if ($trip_id > 0 && $amount > 0) {
        $ins = $db->prepare("INSERT INTO trip_expenses (trip_id, expense_category, amount, note, expense_date) VALUES (?, ?, ?, ?, ?)");
        $ins->execute([$trip_id, $category, $amount, $note, $date]);
        set_flash('success', 'ট্রিপের খরচ সফলভাবে যুক্ত হয়েছে।');
        header('Location: ' . BASE_URL . '/admin/expenses.php?trip_id=' . $trip_id);
        exit;
    }
}

$selected_trip_id = isset($_GET['trip_id']) ? (int)$_GET['trip_id'] : 0;

$trips = $db->query("
    SELECT t.id, t.journey_date, t.departure_time, b.name as bus_name, b.bus_number, r.origin, r.destination,
           (SELECT COALESCE(SUM(total_fare), 0) FROM bookings WHERE trip_id = t.id AND booking_status != 'cancelled') as ticket_revenue,
           (SELECT COALESCE(SUM(amount), 0) FROM trip_expenses WHERE trip_id = t.id) as total_expenses
    FROM trips t
    JOIN buses b ON t.bus_id = b.id
    JOIN routes r ON t.route_id = r.id
    ORDER BY t.journey_date DESC
")->fetchAll();

if ($selected_trip_id === 0 && !empty($trips)) {
    $selected_trip_id = (int)$trips[0]['id'];
}

// সিলেক্টেড ট্রিপের খরচসমূহ
$expenses = [];
$current_trip = null;
if ($selected_trip_id > 0) {
    foreach ($trips as $t) {
        if ((int)$t['id'] === $selected_trip_id) {
            $current_trip = $t;
            break;
        }
    }
    $exp_stmt = $db->prepare("SELECT * FROM trip_expenses WHERE trip_id = ? ORDER BY id DESC");
    $exp_stmt->execute([$selected_trip_id]);
    $expenses = $exp_stmt->fetchAll();
}
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-fuel-pump text-danger me-2"></i>ট্রিপ খরচ ও লাভ-লোকসান হিসাব (Trip Expenses & Net Profit)
        </h4>
        <span class="text-muted small">ডিজেল, টোল, চালক-হেলপার ভাতা ও ট্রিপভিত্তিক নিট আয় হিসাব</span>
    </div>
    <div>
        <a href="<?= BASE_URL ?>/admin/manifest.php?trip_id=<?= $selected_trip_id ?>" target="_blank" class="btn btn-outline-dark">
            <i class="bi bi-card-checklist me-1"></i> ওয়েবিল প্রিন্ট
        </a>
    </div>
</div>

<!-- ট্রিপ সিলেক্টর -->
<div class="card shadow-sm mb-4 border-0">
    <div class="card-body bg-white p-3 rounded">
        <form method="GET" action="" class="row g-2 align-items-center">
            <div class="col-md-3">
                <label class="form-label small fw-bold mb-0">ট্রিপ নির্বাচন করুন:</label>
            </div>
            <div class="col-md-7">
                <select name="trip_id" class="form-select fw-semibold" onchange="this.form.submit()">
                    <?php foreach ($trips as $tp): ?>
                        <option value="<?= $tp['id'] ?>" <?= $tp['id'] == $selected_trip_id ? 'selected' : '' ?>>
                            <?= htmlspecialchars($tp['bus_name']) ?> (<?= htmlspecialchars($tp['bus_number']) ?>) | <?= htmlspecialchars($tp['origin']) ?> → <?= htmlspecialchars($tp['destination']) ?> | <?= format_bn_date($tp['journey_date']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100">লোড করুন</button>
            </div>
        </form>
    </div>
</div>

<?php if ($current_trip): 
    $revenue = (float)$current_trip['ticket_revenue'];
    $total_exp = (float)$current_trip['total_expenses'];
    $net_profit = $revenue - $total_exp;
?>
    <!-- আর্থিক সামারি কার্ডস -->
    <div class="row g-3 mb-4">
        <div class="col-md-4">
            <div class="stat-card bg-white border shadow-sm">
                <span class="text-muted small">টিকিট বিক্রি হতে মোট আয়</span>
                <div class="fs-3 fw-bold text-primary font-monospace mt-1"><?= format_taka($revenue) ?></div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card bg-white border shadow-sm">
                <span class="text-muted small">মোট ট্রিপ খরচ (ডিজেল, টোল, ভাতা)</span>
                <div class="fs-3 fw-bold text-danger font-monospace mt-1"><?= format_taka($total_exp) ?></div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="stat-card bg-white border shadow-sm">
                <span class="text-muted small">ট্রিপের নিট লাভ (Net Profit)</span>
                <div class="fs-3 fw-bold <?= $net_profit >= 0 ? 'text-success' : 'text-danger' ?> font-monospace mt-1">
                    <?= format_taka($net_profit) ?>
                </div>
            </div>
        </div>
    </div>

    <div class="row g-4">
        <!-- খরচ যুক্ত করার ফরম -->
        <div class="col-lg-4">
            <div class="card shadow-sm">
                <div class="card-header bg-dark text-white py-3">
                    <h6 class="mb-0 fw-bold"><i class="bi bi-plus-circle me-1"></i>নতুন খরচ এন্ট্রি</h6>
                </div>
                <div class="card-body">
                    <form method="POST" action="">
                        <?= csrf_field() ?>
                        <input type="hidden" name="action" value="add_expense">
                        <input type="hidden" name="trip_id" value="<?= $current_trip['id'] ?>">

                        <div class="mb-3">
                            <label class="form-label small fw-bold">খরচের খাত (Category)</label>
                            <select name="expense_category" class="form-select" required>
                                <option value="ডিজেল / জ্বালানি">ডিজেল / জ্বালানি</option>
                                <option value="টোল ও ফেরি">টোল ও ফেরি</option>
                                <option value="ড্রাইভার ও হেলপার ভাতা">ড্রাইভার ও হেলপার ভাতা</option>
                                <option value="রোড ও পুলিশ খরচ">রোড ও পুলিশ খরচ</option>
                                <option value="কাউন্টার কমিশন">কাউন্টার কমিশন</option>
                                <option value="অন্যান্য">অন্যান্য</option>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold">টাকার পরিমাণ <span class="text-danger">*</span></label>
                            <input type="number" step="any" min="1" name="amount" class="form-control font-monospace fw-bold" placeholder="টাকার পরিমাণ লিখুন" required>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold">বিবরণ / নোট</label>
                            <input type="text" name="note" class="form-control" placeholder="যেমন: মেঘনা ফিলিং স্টেশন ৬০ লিটার">
                        </div>

                        <div class="mb-4">
                            <label class="form-label small fw-bold">তারিখ</label>
                            <input type="date" name="expense_date" class="form-control" value="<?= date('Y-m-d') ?>" required>
                        </div>

                        <button type="submit" class="btn btn-success w-100 fw-bold">
                            <i class="bi bi-check-lg me-1"></i> খরচ সংরক্ষণ করুন
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- খরচের তালিকা টেবিল -->
        <div class="col-lg-8">
            <div class="card shadow-sm h-100">
                <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold text-dark">এই ট্রিপের খরচের বিস্তারিত ভাউচার</h6>
                    <span class="badge bg-light text-dark border"><?= en2bn(count($expenses)) ?>টি ভাউচার</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light small">
                                <tr>
                                    <th>তারিখ</th>
                                    <th>খরচের খাত</th>
                                    <th>বিবরণ / নোট</th>
                                    <th class="text-end">পরিমাণ</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($expenses)): ?>
                                    <tr><td colspan="4" class="text-center p-4 text-muted">এখনো কোনো খরচ এন্ট্রি করা হয়নি।</td></tr>
                                <?php else: ?>
                                    <?php foreach ($expenses as $ex): ?>
                                        <tr>
                                            <td class="small"><?= format_bn_date($ex['expense_date']) ?></td>
                                            <td>
                                                <span class="badge bg-secondary-subtle text-dark"><?= htmlspecialchars($ex['expense_category']) ?></span>
                                            </td>
                                            <td class="small text-muted"><?= htmlspecialchars($ex['note'] ?: '-') ?></td>
                                            <td class="text-end font-monospace fw-bold text-danger">
                                                <?= format_taka($ex['amount']) ?>
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
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
