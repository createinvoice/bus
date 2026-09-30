<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * রুট ব্যবস্থাপনা পেজ (Route Management)
 */

$page_title = 'রুট ব্যবস্থাপনা - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    check_csrf();
    $action = $_POST['action'];

    if ($action === 'create_route') {
        $origin = trim($_POST['origin'] ?? '');
        $destination = trim($_POST['destination'] ?? '');
        $distance_km = (int)($_POST['distance_km'] ?? 0);
        $estimated_time = trim($_POST['estimated_time'] ?? '');
        $status = trim($_POST['status'] ?? 'active');

        if (!empty($origin) && !empty($destination)) {
            $ins = $db->prepare("INSERT INTO routes (origin, destination, distance_km, estimated_time, status) VALUES (?, ?, ?, ?, ?)");
            $ins->execute([$origin, $destination, $distance_km, $estimated_time, $status]);
            set_flash('success', "নতুন রুট '{$origin} হতে {$destination}' সফলভাবে যুক্ত হয়েছে।");
            header('Location: ' . BASE_URL . '/admin/routes.php');
            exit;
        }
    } elseif ($action === 'edit_route') {
        $id = (int)($_POST['route_id'] ?? 0);
        $origin = trim($_POST['origin'] ?? '');
        $destination = trim($_POST['destination'] ?? '');
        $distance_km = (int)($_POST['distance_km'] ?? 0);
        $estimated_time = trim($_POST['estimated_time'] ?? '');
        $status = trim($_POST['status'] ?? 'active');

        $upd = $db->prepare("UPDATE routes SET origin = ?, destination = ?, distance_km = ?, estimated_time = ?, status = ? WHERE id = ?");
        $upd->execute([$origin, $destination, $distance_km, $estimated_time, $status, $id]);
        set_flash('success', 'রুটের তথ্য সফলভাবে আপডেট হয়েছে।');
        header('Location: ' . BASE_URL . '/admin/routes.php');
        exit;
    }
}

$routes = $db->query("
    SELECT r.*, (SELECT COUNT(*) FROM trips WHERE route_id = r.id) as trips_count
    FROM routes r
    ORDER BY r.id DESC
")->fetchAll();
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-geo-alt-fill text-danger me-2"></i>বাস রুট তালিকা ও ব্যবস্থাপনা
        </h4>
        <span class="text-muted small">গন্তব্য ও ভ্রমণের রুট পরিচালনা করুন</span>
    </div>
    <div>
        <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#newRouteModal">
            <i class="bi bi-plus-circle me-1"></i> নতুন রুট যুক্ত করুন
        </button>
    </div>
</div>

<div class="card shadow-sm">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-dark small">
                    <tr>
                        <th>যাত্রা শুরু (Origin)</th>
                        <th>গন্তব্য (Destination)</th>
                        <th>দূরত্ব (কি.মি.)</th>
                        <th>আনুমানিক সময়</th>
                        <th class="text-center">সংশ্লিষ্ট ট্রিপ</th>
                        <th class="text-center">স্ট্যাটাস</th>
                        <th class="text-center">অ্যাকশন</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($routes)): ?>
                        <tr><td colspan="7" class="text-center p-4 text-muted">কোনো রুট পাওয়া যায়নি।</td></tr>
                    <?php else: ?>
                        <?php foreach ($routes as $r): ?>
                            <tr>
                                <td class="fw-bold text-dark"><?= htmlspecialchars($r['origin']) ?></td>
                                <td class="fw-bold text-primary"><?= htmlspecialchars($r['destination']) ?></td>
                                <td><?= en2bn($r['distance_km']) ?> কি.মি.</td>
                                <td><?= htmlspecialchars($r['estimated_time']) ?></td>
                                <td class="text-center font-monospace"><?= en2bn($r['trips_count']) ?>টি</td>
                                <td class="text-center">
                                    <?php if ($r['status'] === 'active'): ?>
                                        <span class="badge bg-success-subtle text-success">সক্রিয়</span>
                                    <?php else: ?>
                                        <span class="badge bg-danger-subtle text-danger">নিষ্ক্রিয়</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-center">
                                    <button class="btn btn-outline-secondary btn-sm" data-bs-toggle="modal" data-bs-target="#editRouteModal<?= $r['id'] ?>">
                                        <i class="bi bi-pencil-square"></i> এডিট
                                    </button>

                                    <!-- রুট এডিট মোডাল -->
                                    <div class="modal fade text-start" id="editRouteModal<?= $r['id'] ?>" tabindex="-1">
                                        <div class="modal-dialog">
                                            <div class="modal-content">
                                                <form method="POST" action="">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="action" value="edit_route">
                                                    <input type="hidden" name="route_id" value="<?= $r['id'] ?>">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title fw-bold">রুট সম্পাদন</h5>
                                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                                    </div>
                                                    <div class="modal-body">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">শুরুর স্থান (Origin)</label>
                                                            <input type="text" name="origin" class="form-control" value="<?= htmlspecialchars($r['origin']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">গন্তব্য (Destination)</label>
                                                            <input type="text" name="destination" class="form-control" value="<?= htmlspecialchars($r['destination']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">দূরত্ব (কিলোমিটার)</label>
                                                            <input type="number" name="distance_km" class="form-control" value="<?= $r['distance_km'] ?>">
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">আনুমানিক সময়</label>
                                                            <input type="text" name="estimated_time" class="form-control" value="<?= htmlspecialchars($r['estimated_time']) ?>">
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">স্ট্যাটাস</label>
                                                            <select name="status" class="form-select">
                                                                <option value="active" <?= $r['status'] === 'active' ? 'selected' : '' ?>>সক্রিয়</option>
                                                                <option value="inactive" <?= $r['status'] === 'inactive' ? 'selected' : '' ?>>নিষ্ক্রিয়</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বাতিল</button>
                                                        <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- নতুন রুট মোডাল -->
<div class="modal fade" id="newRouteModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST" action="">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="create_route">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-geo-alt-fill me-2"></i>নতুন রুট যুক্ত করুন</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label fw-bold">শুরুর স্থান (Origin) <span class="text-danger">*</span></label>
                        <input type="text" name="origin" class="form-control" placeholder="যেমন: ঢাকা" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">গন্তব্য (Destination) <span class="text-danger">*</span></label>
                        <input type="text" name="destination" class="form-control" placeholder="যেমন: কুষ্টিয়া" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">দূরত্ব (কিলোমিটার)</label>
                        <input type="number" name="distance_km" class="form-control" placeholder="যেমন: 210" value="0">
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">আনুমানিক ভ্রমণের সময়</label>
                        <input type="text" name="estimated_time" class="form-control" placeholder="যেমন: ৫ ঘণ্টা ৩০ মিনিট" value="৫ ঘণ্টা">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বাতিল</button>
                    <button type="submit" class="btn btn-success fw-bold">রুট সংরক্ষণ করুন</button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
