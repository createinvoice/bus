<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * আদায় ও ডেইলি ক্লোজিং ড্যাশবোর্ড (Collection & Daily Closing Management)
 */

$page_title = 'আদায় ও ডেইলি ক্লোজিং - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// ফিল্টার তারিখ (ডিফল্ট আজকের তারিখ)
$closing_date = $_GET['date'] ?? date('Y-m-d');

// ১. নির্বাচিত দিনের সার্বিক আদায়ের পরিসংখ্যান
$stats_stmt = $db->prepare("
    SELECT 
        COALESCE(SUM(amount), 0) as total_collection,
        COALESCE(SUM(CASE WHEN payment_type = 'advance' THEN amount ELSE 0 END), 0) as advance_collection,
        COALESCE(SUM(CASE WHEN payment_type = 'due_collection' THEN amount ELSE 0 END), 0) as due_collection,
        COALESCE(SUM(CASE WHEN payment_type = 'full_payment' THEN amount ELSE 0 END), 0) as full_collection,
        COUNT(id) as total_transactions
    FROM payments
    WHERE DATE(payment_date) = ?
");
$stats_stmt->execute([$closing_date]);
$daily_stats = $stats_stmt->fetch();

// ২. পেমেন্ট মেথড অনুযায়ী আদায় (নগদ, বিকাশ, নগদ, রকেট ইত্যাদি)
$method_stmt = $db->prepare("
    SELECT payment_method, COALESCE(SUM(amount), 0) as method_total, COUNT(id) as trx_count
    FROM payments
    WHERE DATE(payment_date) = ?
    GROUP BY payment_method
    ORDER BY method_total DESC
");
$method_stmt->execute([$closing_date]);
$methods_summary = $method_stmt->fetchAll();

// ৩. ব্যবহারকারী/অপারেটরভিত্তিক ডেইলি ক্লোজিং সারসংক্ষেপ (Section 23 Daily Closing)
$user_closing_stmt = $db->prepare("
    SELECT 
        u.id as user_id, u.name as user_name, u.counter_name, u.phone as user_phone,
        (SELECT COUNT(id) FROM bookings WHERE user_id = u.id AND DATE(created_at) = ?) as total_bookings,
        (SELECT COALESCE(SUM(total_seats), 0) FROM bookings WHERE user_id = u.id AND DATE(created_at) = ? AND booking_status != 'cancelled') as total_passengers,
        COALESCE(SUM(p.amount), 0) as total_collected,
        COALESCE(SUM(CASE WHEN p.payment_type = 'advance' THEN p.amount ELSE 0 END), 0) as advance_collected,
        COALESCE(SUM(CASE WHEN p.payment_type = 'due_collection' THEN p.amount ELSE 0 END), 0) as due_collected
    FROM users u
    LEFT JOIN payments p ON u.id = p.user_id AND DATE(p.payment_date) = ?
    GROUP BY u.id
    HAVING total_collected > 0 OR total_bookings > 0
    ORDER BY total_collected DESC
");
$user_closing_stmt->execute([$closing_date, $closing_date, $closing_date]);
$user_closings = $user_closing_stmt->fetchAll();

// ৪. বাস অনুযায়ী আজকের আদায় (Bus-wise collection)
$bus_closing_stmt = $db->prepare("
    SELECT 
        b.id, b.name as bus_name, b.bus_number, b.bus_type,
        COUNT(DISTINCT bk.id) as total_bookings,
        COALESCE(SUM(bk.total_seats), 0) as total_passengers,
        COALESCE(SUM(bk.total_fare), 0) as total_fare,
        COALESCE(SUM(bk.advance_paid), 0) as total_advance,
        COALESCE(SUM(bk.due_amount), 0) as total_due
    FROM buses b
    JOIN trips t ON b.id = t.bus_id
    JOIN bookings bk ON t.id = bk.trip_id AND DATE(bk.created_at) = ? AND bk.booking_status != 'cancelled'
    GROUP BY b.id
    ORDER BY total_advance DESC
");
$bus_closing_stmt->execute([$closing_date]);
$bus_closings = $bus_closing_stmt->fetchAll();

// ৫. বিগত ৭ দিনের তারিখভিত্তিক আদায়ের সারসংক্ষেপ
$date_summary_stmt = $db->query("
    SELECT 
        DATE(p.payment_date) as pay_date,
        COUNT(DISTINCT p.booking_id) as bookings_count,
        COALESCE(SUM(CASE WHEN p.payment_type = 'advance' THEN p.amount ELSE 0 END), 0) as advance_total,
        COALESCE(SUM(CASE WHEN p.payment_type = 'due_collection' THEN p.amount ELSE 0 END), 0) as due_total,
        COALESCE(SUM(p.amount), 0) as grand_total
    FROM payments p
    GROUP BY DATE(p.payment_date)
    ORDER BY pay_date DESC
    LIMIT 10
");
$date_summaries = $date_summary_stmt->fetchAll();
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-cash-stack text-success me-2"></i>আদায় বিবরণী ও ডেইলি ক্লোজিং (Daily Closing)
        </h4>
        <span class="text-muted small">
            তারিখ: <strong class="text-dark"><?= format_bn_date($closing_date) ?></strong> এর মোট আদায় ও অপারেটরভিত্তিক হিসাব
        </span>
    </div>
    <div class="d-flex gap-2 no-print">
        <!-- তারিখ পরিবর্তন ফর্ম -->
        <form method="GET" action="" class="d-flex align-items-center gap-2">
            <input type="date" name="date" class="form-control" value="<?= htmlspecialchars($closing_date) ?>" onchange="this.form.submit()">
        </form>
        <button onclick="window.print()" class="btn btn-outline-dark">
            <i class="bi bi-printer me-1"></i> রিপোর্ট প্রিন্ট
        </button>
    </div>
</div>

<!-- দৈনিক সারসংক্ষেপ কার্ডসমূহ -->
<div class="row g-3 mb-4">
    <!-- মোট আদায় -->
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="text-muted small fw-semibold">আজকের মোট আদায় (Grand Total)</div>
            <div class="fs-3 fw-bold text-success mt-1 font-monospace">
                <?= format_taka($daily_stats['total_collection']) ?>
            </div>
            <div class="text-muted small mt-1">মোট লেনদেন: <?= en2bn($daily_stats['total_transactions']) ?>টি</div>
        </div>
    </div>

    <!-- অগ্রিম আদায় -->
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="text-muted small fw-semibold">অগ্রিম আদায় (Advance)</div>
            <div class="fs-3 fw-bold text-primary mt-1 font-monospace">
                <?= format_taka($daily_stats['advance_collection']) ?>
            </div>
            <div class="text-muted small mt-1">বুকিংয়ের সময় গৃহীত</div>
        </div>
    </div>

    <!-- বাকি টাকা আদায় -->
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="text-muted small fw-semibold">বাকি টাকা আদায় (Due Collection)</div>
            <div class="fs-3 fw-bold text-info mt-1 font-monospace">
                <?= format_taka($daily_stats['due_collection']) ?>
            </div>
            <div class="text-muted small mt-1">যাত্রীদের বকেয়া পরিশোধ</div>
        </div>
    </div>

    <!-- সম্পূর্ণ পরিশোধ -->
    <div class="col-sm-6 col-lg-3">
        <div class="stat-card bg-white border shadow-sm">
            <div class="text-muted small fw-semibold">এককালীন সম্পূর্ণ পরিশোধ</div>
            <div class="fs-3 fw-bold text-dark mt-1 font-monospace">
                <?= format_taka($daily_stats['full_collection']) ?>
            </div>
            <div class="text-muted small mt-1">বকেয়ামুক্ত টিকিট</div>
        </div>
    </div>
</div>

<!-- অপারেটর অনুযায়ী ডেইলি ক্লোজিং টেবিল (Daily Closing Section 23) -->
<div class="card shadow-sm mb-4">
    <div class="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold"><i class="bi bi-people-fill text-warning me-2"></i>অপারেটরদের ডেইলি ক্লোজিং সারসংক্ষেপ (Operator-wise Daily Closing)</span>
        <span class="badge bg-warning text-dark font-monospace fw-bold">তারিখ: <?= format_bn_date($closing_date) ?></span>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light small">
                    <tr>
                        <th>অপারেটর ও কাউন্টার</th>
                        <th class="text-center">বুকিং সংখ্যা</th>
                        <th class="text-center">যাত্রী সংখ্যা</th>
                        <th class="text-end">অগ্রিম সংগ্রহ</th>
                        <th class="text-end">বাকি আদায়</th>
                        <th class="text-end bg-success-subtle fw-bold">সর্বমোট আদায় (Grand Total)</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($user_closings)): ?>
                        <tr><td colspan="6" class="text-center p-4 text-muted">এই তারিখে কোনো অপারেটরের লেনদেন পাওয়া যায়নি।</td></tr>
                    <?php else: ?>
                        <?php 
                        $total_all = 0;
                        $total_bks = 0;
                        $total_psg = 0;
                        foreach ($user_closings as $uc): 
                            $total_all += (float)$uc['total_collected'];
                            $total_bks += (int)$uc['total_bookings'];
                            $total_psg += (int)$uc['total_passengers'];
                        ?>
                            <tr>
                                <td>
                                    <div class="fw-bold text-dark"><?= htmlspecialchars($uc['user_name']) ?></div>
                                    <span class="badge bg-light text-dark border">
                                        <i class="bi bi-geo-alt-fill text-danger me-1"></i><?= htmlspecialchars($uc['counter_name']) ?>
                                    </span>
                                </td>
                                <td class="text-center font-monospace"><?= en2bn($uc['total_bookings']) ?>টি</td>
                                <td class="text-center font-monospace"><?= en2bn($uc['total_passengers']) ?> জন</td>
                                <td class="text-end font-monospace text-primary"><?= format_taka($uc['advance_collected']) ?></td>
                                <td class="text-end font-monospace text-info"><?= format_taka($uc['due_collected']) ?></td>
                                <td class="text-end font-monospace fw-bold fs-6 text-success bg-success-subtle">
                                    <?= format_taka($uc['total_collected']) ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        <tr class="table-dark fw-bold">
                            <td>সর্বমোট হিসাব (Grand Total):</td>
                            <td class="text-center font-monospace"><?= en2bn($total_bks) ?>টি</td>
                            <td class="text-center font-monospace"><?= en2bn($total_psg) ?> জন</td>
                            <td colspan="2" class="text-end">সর্বমোট ক্যাশ জমা:</td>
                            <td class="text-end font-monospace fs-5 text-warning"><?= format_taka($total_all) ?></td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="row g-4 mb-4">
    <!-- বাস অনুযায়ী আদায় (Bus-wise Collection) -->
    <div class="col-lg-7">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3">
                <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-bus-front text-success me-2"></i>বাস অনুযায়ী আদায় (Bus-wise Collection)</h6>
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
                            <?php if (empty($bus_closings)): ?>
                                <tr><td colspan="5" class="text-center p-3 text-muted">এই তারিখে কোনো বাসের বুকিং হয়নি।</td></tr>
                            <?php else: ?>
                                <?php foreach ($bus_closings as $bc): ?>
                                    <tr>
                                        <td>
                                            <div class="fw-semibold text-dark"><?= htmlspecialchars($bc['bus_name']) ?></div>
                                            <span class="text-muted small"><?= htmlspecialchars($bc['bus_number']) ?></span>
                                        </td>
                                        <td class="text-center font-monospace"><?= en2bn($bc['total_bookings']) ?>টি</td>
                                        <td class="text-end font-monospace"><?= format_taka($bc['total_fare']) ?></td>
                                        <td class="text-end font-monospace fw-bold text-success"><?= format_taka($bc['total_advance']) ?></td>
                                        <td class="text-end font-monospace text-danger"><?= format_taka($bc['total_due']) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- পেমেন্ট মেথড অনুযায়ী বণ্টন -->
    <div class="col-lg-5">
        <div class="card shadow-sm h-100">
            <div class="card-header bg-white py-3">
                <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-credit-card text-primary me-2"></i>পেমেন্ট মেথডভিত্তিক কালেকশন</h6>
            </div>
            <div class="card-body p-0">
                <ul class="list-group list-group-flush">
                    <?php if (empty($methods_summary)): ?>
                        <li class="list-group-item text-center p-4 text-muted">কোনো লেনদেন রেকর্ড নেই।</li>
                    <?php else: ?>
                        <?php foreach ($methods_summary as $m): ?>
                            <li class="list-group-item d-flex justify-content-between align-items-center p-3">
                                <div>
                                    <strong class="text-dark"><?= htmlspecialchars($m['payment_method']) ?></strong>
                                    <div class="text-muted small">লেনদেন সংখ্যা: <?= en2bn($m['trx_count']) ?>টি</div>
                                </div>
                                <span class="fs-5 fw-bold font-monospace text-success">
                                    <?= format_taka($m['method_total']) ?>
                                </span>
                            </li>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- বিগত দিনসমূহের আদায়ের সারসংক্ষেপ (Section 6: তারিখ | বুকিং | অগ্রিম | বাকি আদায় | মোট আদায়) -->
<div class="card shadow-sm">
    <div class="card-header bg-white py-3">
        <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-calendar3 text-secondary me-2"></i>তারিখ অনুযায়ী আদায়ের খতিয়ান (Date-wise Collection Summary)</h6>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-light small">
                    <tr>
                        <th>তারিখ</th>
                        <th class="text-center">বুকিং সংখ্যা</th>
                        <th class="text-end">অগ্রিম আদায়</th>
                        <th class="text-end">বাকি আদায়</th>
                        <th class="text-end fw-bold">সর্বমোট আদায়</th>
                        <th class="text-center">বিস্তারিত</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($date_summaries as $ds): ?>
                        <tr>
                            <td>
                                <strong><?= format_bn_date($ds['pay_date']) ?></strong>
                                <span class="text-muted small font-monospace d-block"><?= htmlspecialchars($ds['pay_date']) ?></span>
                            </td>
                            <td class="text-center font-monospace"><?= en2bn($ds['bookings_count']) ?>টি</td>
                            <td class="text-end font-monospace text-primary"><?= format_taka($ds['advance_total']) ?></td>
                            <td class="text-end font-monospace text-info"><?= format_taka($ds['due_total']) ?></td>
                            <td class="text-end font-monospace fw-bold text-success fs-6"><?= format_taka($ds['grand_total']) ?></td>
                            <td class="text-center">
                                <a href="?date=<?= htmlspecialchars($ds['pay_date']) ?>" class="btn btn-outline-secondary btn-sm">
                                    <i class="bi bi-eye"></i> বিস্তারিত
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
