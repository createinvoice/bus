<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ইউজার-বাস ও ট্রিপ বরাদ্দ পেজ (User Bus & Trip Assignments)
 */

$page_title = 'বাস ও ট্রিপ বরাদ্দ - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// বরাদ্দ যোগ বা মুছে ফেলার হ্যান্ডলার
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    check_csrf();
    $action = $_POST['action'];

    if ($action === 'create_assignment') {
        $user_id = (int)($_POST['user_id'] ?? 0);
        $bus_id = (int)($_POST['bus_id'] ?? 0);
        $trip_id = !empty($_POST['trip_id']) ? (int)$_POST['trip_id'] : null;

        if ($user_id <= 0 || $bus_id <= 0) {
            set_flash('danger', 'দয়া করে ব্যবহারকারী এবং বাস নির্বাচন করুন।');
        } else {
            // ডুপ্লিকেট অ্যাসাইনমেন্ট চেক
            $chk = $db->prepare("
                SELECT id FROM user_bus_assignments 
                WHERE user_id = ? AND bus_id = ? AND (trip_id = ? OR (trip_id IS NULL AND ? IS NULL))
            ");
            $chk->execute([$user_id, $bus_id, $trip_id, $trip_id]);

            if ($chk->fetch()) {
                set_flash('warning', 'এই ব্যবহারকারীর জন্য এই বাস/ট্রিপ ইতিমধ্যে বরাদ্দ করা আছে!');
            } else {
                $ins = $db->prepare("INSERT INTO user_bus_assignments (user_id, bus_id, trip_id) VALUES (?, ?, ?)");
                $ins->execute([$user_id, $bus_id, $trip_id]);
                set_flash('success', 'বাস/ট্রিপ সফলভাবে বরাদ্দ করা হয়েছে!');
                header('Location: ' . BASE_URL . '/admin/assignments.php');
                exit;
            }
        }
    } elseif ($action === 'delete_assignment') {
        $id = (int)($_POST['assignment_id'] ?? 0);
        $del = $db->prepare("DELETE FROM user_bus_assignments WHERE id = ?");
        $del->execute([$id]);
        set_flash('success', 'বরাদ্দ সফলভাবে বাতিল করা হয়েছে।');
        header('Location: ' . BASE_URL . '/admin/assignments.php');
        exit;
    }
}

// ফিল্টার
$filter_user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
$filter_bus_id = isset($_GET['bus_id']) ? (int)$_GET['bus_id'] : 0;

$where = [];
$params = [];
if ($filter_user_id > 0) {
    $where[] = "uba.user_id = ?";
    $params[] = $filter_user_id;
}
if ($filter_bus_id > 0) {
    $where[] = "uba.bus_id = ?";
    $params[] = $filter_bus_id;
}
$where_sql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

// অ্যাসাইনমেন্ট তালিকা লোড
$assignments_stmt = $db->prepare("
    SELECT 
        uba.id, uba.assigned_at,
        u.name as user_name, u.counter_name, u.phone as user_phone,
        b.name as bus_name, b.bus_number, b.bus_type,
        t.journey_date, t.departure_time,
        r.origin, r.destination
    FROM user_bus_assignments uba
    JOIN users u ON uba.user_id = u.id
    JOIN buses b ON uba.bus_id = b.id
    LEFT JOIN trips t ON uba.trip_id = t.id
    LEFT JOIN routes r ON t.route_id = r.id
    $where_sql
    ORDER BY uba.id DESC
");
$assignments_stmt->execute($params);
$assignments = $assignments_stmt->fetchAll();

// ড্রপডাউনের জন্য ব্যবহারকারী, বাস ও ট্রিপ লোড
$users = $db->query("SELECT id, name, counter_name, phone FROM users WHERE status = 'active' ORDER BY name ASC")->fetchAll();
$buses = $db->query("SELECT id, name, bus_number FROM buses WHERE status = 'active' ORDER BY name ASC")->fetchAll();
$trips = $db->query("
    SELECT t.id, t.journey_date, t.departure_time, b.name as bus_name, r.origin, r.destination
    FROM trips t
    JOIN buses b ON t.bus_id = b.id
    JOIN routes r ON t.route_id = r.id
    WHERE t.status = 'scheduled'
    ORDER BY t.journey_date ASC
")->fetchAll();
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-person-check-fill text-success me-2"></i>ব্যবহারকারীকে বাস ও ট্রিপ বরাদ্দ
        </h4>
        <span class="text-muted small">কাউন্টার অপারেটরদের জন্য নির্দিষ্ট বাস বা ট্রিপ নির্ধারণ করুন (অপারেটর কেবল বরাদ্দকৃত বাসের টিকিট বিক্রি করতে পারবে)</span>
    </div>
    <div>
        <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#newAssignModal">
            <i class="bi bi-plus-circle me-1"></i> নতুন বরাদ্দ যোগ করুন
        </button>
    </div>
</div>

<div class="card shadow-sm">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-dark small">
                    <tr>
                        <th>অপারেটর ও কাউন্টার</th>
                        <th>মোবাইল নম্বর</th>
                        <th>বরাদ্দকৃত বাস</th>
                        <th>নির্দিষ্ট ট্রিপ (ঐচ্ছিক)</th>
                        <th>বরাদ্দের তারিখ</th>
                        <th class="text-center">অ্যাকশন</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($assignments)): ?>
                        <tr><td colspan="6" class="text-center p-4 text-muted">কোনো বরাদ্দ রেকর্ড পাওয়া যায়নি।</td></tr>
                    <?php else: ?>
                        <?php foreach ($assignments as $a): ?>
                            <tr>
                                <td>
                                    <div class="fw-bold text-dark"><?= htmlspecialchars($a['user_name']) ?></div>
                                    <span class="badge bg-light text-dark border">
                                        <i class="bi bi-geo-alt-fill text-danger me-1"></i><?= htmlspecialchars($a['counter_name']) ?>
                                    </span>
                                </td>
                                <td><?= htmlspecialchars($a['user_phone']) ?></td>
                                <td>
                                    <div class="fw-bold text-success"><?= htmlspecialchars($a['bus_name']) ?></div>
                                    <span class="text-muted small font-monospace"><?= htmlspecialchars($a['bus_number']) ?> (<?= get_bus_type_bn($a['bus_type']) ?>)</span>
                                </td>
                                <td>
                                    <?php if ($a['origin'] && $a['destination']): ?>
                                        <div class="small fw-semibold"><?= htmlspecialchars($a['origin']) ?> → <?= htmlspecialchars($a['destination']) ?></div>
                                        <div class="text-muted small"><?= format_bn_date($a['journey_date']) ?> (<?= format_bn_time($a['departure_time']) ?>)</div>
                                    <?php else: ?>
                                        <span class="badge bg-primary-subtle text-primary">বাসের সকল ট্রিপে অনুমোদিত</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-muted small"><?= format_bn_date($a['assigned_at'], true) ?></td>
                                <td class="text-center">
                                    <form method="POST" action="" onsubmit="return confirm('আপনি কি নিশ্চিত যে এই বরাদ্দ বাতিল করতে চান?');" class="d-inline">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="action" value="delete_assignment">
                                        <input type="hidden" name="assignment_id" value="<?= $a['id'] ?>">
                                        <button type="submit" class="btn btn-outline-danger btn-sm" title="বরাদ্দ বাতিল">
                                            <i class="bi bi-trash3 me-1"></i> বাতিল
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- নতুন বরাদ্দ মোডাল -->
<div class="modal fade" id="newAssignModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST" action="">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="create_assignment">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-person-check me-2"></i>বাস বরাদ্দ নির্ধারণ</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label fw-bold">অপারেটর / ব্যবহারকারী নির্বাচন করুন <span class="text-danger">*</span></label>
                        <select name="user_id" class="form-select" required>
                            <option value="">-- ব্যবহারকারী নির্বাচন করুন --</option>
                            <?php foreach ($users as $u): ?>
                                <option value="<?= $u['id'] ?>" <?= $filter_user_id == $u['id'] ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($u['name']) ?> (<?= htmlspecialchars($u['counter_name']) ?> - <?= htmlspecialchars($u['phone']) ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">বাস নির্বাচন করুন <span class="text-danger">*</span></label>
                        <select name="bus_id" class="form-select" required>
                            <option value="">-- বাস নির্বাচন করুন --</option>
                            <?php foreach ($buses as $b): ?>
                                <option value="<?= $b['id'] ?>" <?= $filter_bus_id == $b['id'] ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($b['name']) ?> (<?= htmlspecialchars($b['bus_number']) ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">নির্দিষ্ট ট্রিপ নির্বাচন করুন (ঐচ্ছিক)</label>
                        <select name="trip_id" class="form-select">
                            <option value="">-- বাসের সকল ট্রিপের জন্য অনুমতি দিন --</option>
                            <?php foreach ($trips as $tp): ?>
                                <option value="<?= $tp['id'] ?>">
                                    <?= htmlspecialchars($tp['bus_name']) ?>: <?= htmlspecialchars($tp['origin']) ?> → <?= htmlspecialchars($tp['destination']) ?> (<?= format_bn_date($tp['journey_date']) ?> - <?= format_bn_time($tp['departure_time']) ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <div class="form-text">যদি নির্দিষ্ট কোনো ট্রিপ না বেছে নেওয়া হয়, তবে অপারেটর এই বাসের সমস্ত ট্রিপ বুকিং করতে পারবে।</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বাতিল</button>
                    <button type="submit" class="btn btn-success fw-bold">বরাদ্দ নিশ্চিত করুন</button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
