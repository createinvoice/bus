<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * বাস ব্যবস্থাপনা পেজ (Bus Management)
 */

$page_title = 'বাস ব্যবস্থাপনা - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// বাস তৈরি ও এডিট অ্যাকশন (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    check_csrf();
    $action = $_POST['action'];

    if ($action === 'create_bus') {
        $name = trim($_POST['name'] ?? '');
        $bus_number = trim($_POST['bus_number'] ?? '');
        $company_name = trim($_POST['company_name'] ?? '');
        $bus_type = trim($_POST['bus_type'] ?? 'AC');
        $total_seats = (int)($_POST['total_seats'] ?? 40);
        $default_route_id = !empty($_POST['default_route_id']) ? (int)$_POST['default_route_id'] : null;
        $status = trim($_POST['status'] ?? 'active');

        if (empty($name) || empty($bus_number)) {
            set_flash('danger', 'বাসের নাম এবং বাস নম্বর আবশ্যক!');
        } else {
            // ডুপ্লিকেট চেক
            $chk = $db->prepare("SELECT id FROM buses WHERE bus_number = ?");
            $chk->execute([$bus_number]);
            if ($chk->fetch()) {
                set_flash('danger', 'এই বাস নম্বরটি ইতিমধ্যে সিস্টেমে নিবন্ধিত!');
            } else {
                $db->beginTransaction();
                try {
                    $ins = $db->prepare("
                        INSERT INTO buses (name, bus_number, company_name, bus_type, total_seats, default_route_id, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $ins->execute([$name, $bus_number, $company_name, $bus_type, $total_seats, $default_route_id, $status]);
                    $bus_id = (int)$db->lastInsertId();

                    // বাসের সিট অটো-জেনারেট (2x2 ফরম্যাটে: A1-A4, B1-B4...)
                    $rows = ['A','B','C','D','E','F','G','H','I','J','K','L'];
                    $seat_ins = $db->prepare("INSERT INTO bus_seats (bus_id, seat_number, seat_row, seat_column, status) VALUES (?, ?, ?, ?, 'available')");
                    
                    $created_seats = 0;
                    for ($r = 0; $r < count($rows); $r++) {
                        for ($c = 1; $c <= 4; $c++) {
                            if ($created_seats >= $total_seats) break 2;
                            $seat_code = $rows[$r] . $c;
                            $seat_ins->execute([$bus_id, $seat_code, $r + 1, $c]);
                            $created_seats++;
                        }
                    }

                    $db->commit();
                    set_flash('success', "নতুন বাস '{$name}' এবং এর {$total_seats}টি সিট সফলভাবে তৈরি করা হয়েছে!");
                    header('Location: ' . BASE_URL . '/admin/buses.php');
                    exit;
                } catch (Exception $e) {
                    $db->rollBack();
                    set_flash('danger', 'বাস সংরক্ষণে সমস্যা হয়েছে: ' . $e->getMessage());
                }
            }
        }
    } elseif ($action === 'edit_bus') {
        $id = (int)($_POST['bus_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $bus_number = trim($_POST['bus_number'] ?? '');
        $company_name = trim($_POST['company_name'] ?? '');
        $bus_type = trim($_POST['bus_type'] ?? 'AC');
        $default_route_id = !empty($_POST['default_route_id']) ? (int)$_POST['default_route_id'] : null;
        $status = trim($_POST['status'] ?? 'active');

        $upd = $db->prepare("
            UPDATE buses SET name = ?, bus_number = ?, company_name = ?, bus_type = ?, default_route_id = ?, status = ?
            WHERE id = ?
        ");
        $upd->execute([$name, $bus_number, $company_name, $bus_type, $default_route_id, $status, $id]);
        set_flash('success', 'বাসের বিবরণ সফলভাবে আপডেট করা হয়েছে।');
        header('Location: ' . BASE_URL . '/admin/buses.php');
        exit;
    }
}

// বাস ও রুট লোড
$routes = $db->query("SELECT id, origin, destination FROM routes WHERE status = 'active' ORDER BY origin ASC")->fetchAll();

$buses = $db->query("
    SELECT b.*, r.origin, r.destination,
           (SELECT COUNT(*) FROM trips WHERE bus_id = b.id) as trips_count,
           (SELECT COUNT(*) FROM user_bus_assignments WHERE bus_id = b.id) as assigned_operators
    FROM buses b
    LEFT JOIN routes r ON b.default_route_id = r.id
    ORDER BY b.id DESC
")->fetchAll();
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-bus-front-fill text-success me-2"></i>বাস তালিকা ও ব্যবস্থাপনা
        </h4>
        <span class="text-muted small">কোম্পানির সকল বাস ও সিট কনফিগারেশন পরিচালনা করুন</span>
    </div>
    <div>
        <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#newBusModal">
            <i class="bi bi-plus-circle me-1"></i> নতুন বাস যুক্ত করুন
        </button>
    </div>
</div>

<div class="card shadow-sm">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-dark small">
                    <tr>
                        <th>বাসের নাম ও কোম্পানি</th>
                        <th>বাস নম্বর</th>
                        <th>বাসের ধরন</th>
                        <th class="text-center">মোট সিট</th>
                        <th>ডিফল্ট রুট</th>
                        <th>বরাদ্দকৃত অপারেটর</th>
                        <th class="text-center">স্ট্যাটাস</th>
                        <th class="text-center">অ্যাকশন</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($buses)): ?>
                        <tr><td colspan="8" class="text-center p-4 text-muted">কোনো বাস পাওয়া যায়নি।</td></tr>
                    <?php else: ?>
                        <?php foreach ($buses as $bus): ?>
                            <tr>
                                <td>
                                    <div class="fw-bold text-dark"><?= htmlspecialchars($bus['name']) ?></div>
                                    <span class="text-muted small"><?= htmlspecialchars($bus['company_name']) ?></span>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark border font-monospace fs-6">
                                        <?= htmlspecialchars($bus['bus_number']) ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-secondary-subtle text-dark">
                                        <?= get_bus_type_bn($bus['bus_type']) ?>
                                    </span>
                                </td>
                                <td class="text-center font-monospace fw-bold"><?= en2bn($bus['total_seats']) ?>টি</td>
                                <td>
                                    <?php if ($bus['origin'] && $bus['destination']): ?>
                                        <span class="small fw-semibold"><?= htmlspecialchars($bus['origin']) ?> → <?= htmlspecialchars($bus['destination']) ?></span>
                                    <?php else: ?>
                                        <span class="text-muted small">নির্দিষ্ট নয়</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="badge bg-info-subtle text-info font-monospace">
                                        <?= en2bn($bus['assigned_operators']) ?> জন
                                    </span>
                                </td>
                                <td class="text-center">
                                    <?php if ($bus['status'] === 'active'): ?>
                                        <span class="badge bg-success-subtle text-success">সক্রিয়</span>
                                    <?php else: ?>
                                        <span class="badge bg-danger-subtle text-danger">নিষ্ক্রিয়</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>/admin/seats.php?bus_id=<?= $bus['id'] ?>" class="btn btn-outline-info" title="সিট লেআউট কনফিগার">
                                            <i class="bi bi-grid-3x3"></i> সিট
                                        </a>
                                        <button class="btn btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#editBusModal<?= $bus['id'] ?>" title="এডিট">
                                            <i class="bi bi-pencil-square"></i>
                                        </button>
                                        <a href="<?= BASE_URL ?>/admin/assignments.php?bus_id=<?= $bus['id'] ?>" class="btn btn-outline-success" title="অপারেটর বরাদ্দ">
                                            <i class="bi bi-person-plus"></i>
                                        </a>
                                    </div>

                                    <!-- বাস এডিট মোডাল -->
                                    <div class="modal fade text-start" id="editBusModal<?= $bus['id'] ?>" tabindex="-1">
                                        <div class="modal-dialog">
                                            <div class="modal-content">
                                                <form method="POST" action="">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="action" value="edit_bus">
                                                    <input type="hidden" name="bus_id" value="<?= $bus['id'] ?>">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title fw-bold">বাস তথ্য সম্পাদন</h5>
                                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                                    </div>
                                                    <div class="modal-body">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">বাসের নাম</label>
                                                            <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($bus['name']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">বাস নম্বর</label>
                                                            <input type="text" name="bus_number" class="form-control" value="<?= htmlspecialchars($bus['bus_number']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">কোম্পানি / মালিকের নাম</label>
                                                            <input type="text" name="company_name" class="form-control" value="<?= htmlspecialchars($bus['company_name']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">বাসের ধরন</label>
                                                            <select name="bus_type" class="form-select">
                                                                <option value="AC" <?= $bus['bus_type'] === 'AC' ? 'selected' : '' ?>>এসি (AC)</option>
                                                                <option value="Non-AC" <?= $bus['bus_type'] === 'Non-AC' ? 'selected' : '' ?>>নন-এসি (Non-AC)</option>
                                                                <option value="Deluxe" <?= $bus['bus_type'] === 'Deluxe' ? 'selected' : '' ?>>ডিলাক্স (Deluxe)</option>
                                                                <option value="Sleeper" <?= $bus['bus_type'] === 'Sleeper' ? 'selected' : '' ?>>স্লিপার (Sleeper)</option>
                                                            </select>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">ডিফল্ট রুট</label>
                                                            <select name="default_route_id" class="form-select">
                                                                <option value="">-- রুট নির্বাচন করুন --</option>
                                                                <?php foreach ($routes as $rt): ?>
                                                                    <option value="<?= $rt['id'] ?>" <?= $rt['id'] == $bus['default_route_id'] ? 'selected' : '' ?>>
                                                                        <?= htmlspecialchars($rt['origin']) ?> → <?= htmlspecialchars($rt['destination']) ?>
                                                                    </option>
                                                                <?php endforeach; ?>
                                                            </select>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">স্ট্যাটাস</label>
                                                            <select name="status" class="form-select">
                                                                <option value="active" <?= $bus['status'] === 'active' ? 'selected' : '' ?>>সক্রিয় (Active)</option>
                                                                <option value="inactive" <?= $bus['status'] === 'inactive' ? 'selected' : '' ?>>নিষ্ক্রিয় (Inactive)</option>
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

<!-- নতুন বাস তৈরির মোডাল -->
<div class="modal fade" id="newBusModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST" action="">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="create_bus">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-bus-front-fill me-2"></i>নতুন বাস যোগ করুন</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label fw-bold">বাসের নাম <span class="text-danger">*</span></label>
                        <input type="text" name="name" class="form-control" placeholder="যেমন: সোনার বাংলা এক্সপ্রেস" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">বাস নম্বর / লাইসেন্স প্লেট <span class="text-danger">*</span></label>
                        <input type="text" name="bus_number" class="form-control font-monospace" placeholder="যেমন: ঢাকা-মেট্রো-ব ১৫-৯৮৭৬" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">কোম্পানি / মালিকের নাম</label>
                        <input type="text" name="company_name" class="form-control" placeholder="যেমন: সোনার বাংলা পরিবহন" value="সোনার বাংলা পরিবহন" required>
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label fw-bold">বাসের ধরন</label>
                            <select name="bus_type" class="form-select">
                                <option value="AC" selected>এসি (AC)</option>
                                <option value="Non-AC">নন-এসি (Non-AC)</option>
                                <option value="Deluxe">ডিলাক্স (Deluxe)</option>
                                <option value="Sleeper">স্লিপার (Sleeper)</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label fw-bold">মোট সিট সংখ্যা</label>
                            <input type="number" name="total_seats" class="form-control" value="40" min="10" max="60" required>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">প্রাথমিক নির্ধারিত রুট</label>
                        <select name="default_route_id" class="form-select">
                            <option value="">-- রুট নির্বাচন করুন --</option>
                            <?php foreach ($routes as $rt): ?>
                                <option value="<?= $rt['id'] ?>">
                                    <?= htmlspecialchars($rt['origin']) ?> → <?= htmlspecialchars($rt['destination']) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বাতিল</button>
                    <button type="submit" class="btn btn-success fw-bold">বাস সংরক্ষণ করুন</button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
