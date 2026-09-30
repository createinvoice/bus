<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * বাসের সিট লেআউট কনফিগারেশন পেজ (Seat Layout Management)
 */

$page_title = 'সিট কনফিগারেশন - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

$bus_id = isset($_GET['bus_id']) ? (int)$_GET['bus_id'] : 0;

// সকল বাস লোড
$all_buses = $db->query("SELECT id, name, bus_number, total_seats FROM buses WHERE status = 'active'")->fetchAll();

if ($bus_id <= 0 && !empty($all_buses)) {
    $bus_id = (int)$all_buses[0]['id'];
}

$current_bus = null;
if ($bus_id > 0) {
    $b_stmt = $db->prepare("SELECT * FROM buses WHERE id = ?");
    $b_stmt->execute([$bus_id]);
    $current_bus = $b_stmt->fetch();
}

// সিটের স্ট্যাটাস বা নম্বর আপডেট (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    check_csrf();
    $action = $_POST['action'];

    if ($action === 'update_seat') {
        $seat_id = (int)($_POST['seat_id'] ?? 0);
        $new_seat_no = trim($_POST['seat_number'] ?? '');
        $status = trim($_POST['status'] ?? 'available');

        if (!empty($new_seat_no) && $seat_id > 0) {
            $upd = $db->prepare("UPDATE bus_seats SET seat_number = ?, status = ? WHERE id = ? AND bus_id = ?");
            $upd->execute([$new_seat_no, $status, $seat_id, $bus_id]);
            set_flash('success', "সিট {$new_seat_no}-এর তথ্য সফলভাবে আপডেট হয়েছে।");
        }
        header("Location: " . BASE_URL . "/admin/seats.php?bus_id=" . $bus_id);
        exit;
    } elseif ($action === 'bulk_block_toggle') {
        $seat_id = (int)($_POST['seat_id'] ?? 0);
        $to_status = ($_POST['current_status'] === 'blocked') ? 'available' : 'blocked';
        $upd = $db->prepare("UPDATE bus_seats SET status = ? WHERE id = ? AND bus_id = ?");
        $upd->execute([$to_status, $seat_id, $bus_id]);
        header("Location: " . BASE_URL . "/admin/seats.php?bus_id=" . $bus_id);
        exit;
    }
}

// বাসের সমস্ত সিট লোড
$seats = [];
if ($current_bus) {
    $s_stmt = $db->prepare("SELECT * FROM bus_seats WHERE bus_id = ? ORDER BY seat_row ASC, seat_column ASC");
    $s_stmt->execute([$bus_id]);
    $seats = $s_stmt->fetchAll();
}
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-grid-3x3-gap-fill text-info me-2"></i>বাস সিট লেআউট কনফিগারেশন
        </h4>
        <span class="text-muted small">বাসের সিট নম্বর পরিবর্তন ও সিট ব্লক/আনব্লক করার প্যানেল</span>
    </div>
    <div class="d-flex gap-2">
        <a href="<?= BASE_URL ?>/admin/buses.php" class="btn btn-outline-secondary">
            <i class="bi bi-arrow-left me-1"></i> বাসের তালিকা
        </a>
    </div>
</div>

<!-- বাস সিলেক্টর বার -->
<div class="card shadow-sm mb-4 border-0">
    <div class="card-body bg-white p-3 rounded">
        <form method="GET" action="" class="row g-2 align-items-center">
            <div class="col-md-3">
                <label class="form-label small fw-bold text-secondary mb-0">বাস নির্বাচন করুন:</label>
            </div>
            <div class="col-md-7">
                <select name="bus_id" class="form-select fw-semibold" onchange="this.form.submit()">
                    <?php foreach ($all_buses as $ab): ?>
                        <option value="<?= $ab['id'] ?>" <?= $ab['id'] == $bus_id ? 'selected' : '' ?>>
                            <?= htmlspecialchars($ab['name']) ?> (<?= htmlspecialchars($ab['bus_number']) ?>) - মোট <?= en2bn($ab['total_seats']) ?>টি সিট
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100">সিট দেখুন</button>
            </div>
        </form>
    </div>
</div>

<?php if ($current_bus): ?>
    <div class="card shadow-sm">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <span class="fw-bold text-dark">
                <?= htmlspecialchars($current_bus['name']) ?> (<?= htmlspecialchars($current_bus['bus_number']) ?>) এর সিট তালিকা
            </span>
            <span class="badge bg-light text-dark border">মোট সিট: <?= en2bn(count($seats)) ?>টি</span>
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light small">
                        <tr>
                            <th>সারি ও কলাম</th>
                            <th>বর্তমান সিট নম্বর</th>
                            <th>স্ট্যাটাস</th>
                            <th class="text-center">ব্লক / আনব্লক</th>
                            <th class="text-center">সিট নম্বর এডিট</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($seats as $st): ?>
                            <tr>
                                <td>
                                    সারি: <strong><?= en2bn($st['seat_row']) ?></strong>, কলাম: <strong><?= en2bn($st['seat_column']) ?></strong>
                                </td>
                                <td>
                                    <span class="badge bg-dark fs-6 font-monospace px-3 py-1"><?= htmlspecialchars($st['seat_number']) ?></span>
                                </td>
                                <td>
                                    <?php if ($st['status'] === 'available'): ?>
                                        <span class="badge bg-success-subtle text-success">খালি (Available)</span>
                                    <?php else: ?>
                                        <span class="badge bg-danger-subtle text-danger">ব্লক করা (Blocked)</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-center">
                                    <form method="POST" action="" class="d-inline">
                                        <?= csrf_field() ?>
                                        <input type="hidden" name="action" value="bulk_block_toggle">
                                        <input type="hidden" name="seat_id" value="<?= $st['id'] ?>">
                                        <input type="hidden" name="current_status" value="<?= $st['status'] ?>">
                                        <?php if ($st['status'] === 'available'): ?>
                                            <button type="submit" class="btn btn-outline-danger btn-sm" title="সিট বন্ধ করুন">
                                                <i class="bi bi-slash-circle me-1"></i> ব্লক করুন
                                            </button>
                                        <?php else: ?>
                                            <button type="submit" class="btn btn-outline-success btn-sm" title="সিট খুলুন">
                                                <i class="bi bi-check-circle me-1"></i> মুক্ত করুন
                                            </button>
                                        <?php endif; ?>
                                    </form>
                                </td>
                                <td class="text-center">
                                    <button class="btn btn-outline-primary btn-sm" data-bs-toggle="modal" data-bs-target="#editSeatModal<?= $st['id'] ?>">
                                        <i class="bi bi-pencil me-1"></i> পরিবর্তন
                                    </button>

                                    <!-- সিট এডিট মোডাল -->
                                    <div class="modal fade text-start" id="editSeatModal<?= $st['id'] ?>" tabindex="-1">
                                        <div class="modal-dialog modal-sm">
                                            <div class="modal-content">
                                                <form method="POST" action="">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="action" value="update_seat">
                                                    <input type="hidden" name="seat_id" value="<?= $st['id'] ?>">
                                                    <div class="modal-header">
                                                        <h6 class="modal-title fw-bold">সিট সম্পাদন</h6>
                                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                                    </div>
                                                    <div class="modal-body">
                                                        <div class="mb-3">
                                                            <label class="form-label small fw-bold">সিট নম্বর</label>
                                                            <input type="text" name="seat_number" class="form-control font-monospace" value="<?= htmlspecialchars($st['seat_number']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label small fw-bold">স্ট্যাটাস</label>
                                                            <select name="status" class="form-select">
                                                                <option value="available" <?= $st['status'] === 'available' ? 'selected' : '' ?>>খালি (Available)</option>
                                                                <option value="blocked" <?= $st['status'] === 'blocked' ? 'selected' : '' ?>>ব্লকড (Blocked)</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">বাতিল</button>
                                                        <button type="submit" class="btn btn-primary btn-sm">সংরক্ষণ করুন</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
