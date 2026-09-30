<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ট্রিপ শিডিউল ও ট্রিপ তৈরি পেজ (Trip Management)
 */

$page_title = 'ট্রিপ ব্যবস্থাপনা - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// নতুন ট্রিপ তৈরি বা এডিট অ্যাকশন (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    check_csrf();
    $action = $_POST['action'];

    if ($action === 'create_trip') {
        $bus_id = (int)($_POST['bus_id'] ?? 0);
        $route_id = (int)($_POST['route_id'] ?? 0);
        $journey_date = trim($_POST['journey_date'] ?? '');
        $departure_time = trim($_POST['departure_time'] ?? '');
        $arrival_time = trim($_POST['arrival_time'] ?? '');
        $boarding_point = trim($_POST['boarding_point'] ?? '');
        $dropping_point = trim($_POST['dropping_point'] ?? '');
        $seat_fare = (float)($_POST['seat_fare'] ?? 0);
        $status = trim($_POST['status'] ?? 'scheduled');

        if ($bus_id <= 0 || $route_id <= 0 || empty($journey_date) || empty($departure_time) || $seat_fare <= 0) {
            set_flash('danger', 'দয়া করে বাস, রুট, যাত্রার তারিখ, সময় ও সিট ভাড়া সঠিকভাবে প্রদান করুন।');
        } else {
            $ins = $db->prepare("
                INSERT INTO trips (bus_id, route_id, journey_date, departure_time, arrival_time, boarding_point, dropping_point, seat_fare, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $ins->execute([$bus_id, $route_id, $journey_date, $departure_time, $arrival_time ?: null, $boarding_point, $dropping_point, $seat_fare, $status]);
            set_flash('success', 'নতুন ট্রিপ সফলভাবে তৈরি করা হয়েছে!');
            header('Location: ' . BASE_URL . '/admin/trips.php');
            exit;
        }
    } elseif ($action === 'edit_trip') {
        $id = (int)($_POST['trip_id'] ?? 0);
        $departure_time = trim($_POST['departure_time'] ?? '');
        $boarding_point = trim($_POST['boarding_point'] ?? '');
        $dropping_point = trim($_POST['dropping_point'] ?? '');
        $seat_fare = (float)($_POST['seat_fare'] ?? 0);
        $status = trim($_POST['status'] ?? 'scheduled');

        $upd = $db->prepare("
            UPDATE trips SET departure_time = ?, boarding_point = ?, dropping_point = ?, seat_fare = ?, status = ?
            WHERE id = ?
        ");
        $upd->execute([$departure_time, $boarding_point, $dropping_point, $seat_fare, $status, $id]);
        set_flash('success', 'ট্রিপের তথ্য সফলভাবে আপডেট হয়েছে।');
        header('Location: ' . BASE_URL . '/admin/trips.php');
        exit;
    }
}

// বাস ও রুট লোড
$buses = $db->query("SELECT id, name, bus_number FROM buses WHERE status = 'active'")->fetchAll();
$routes = $db->query("SELECT id, origin, destination FROM routes WHERE status = 'active'")->fetchAll();

// ট্রিপ তালিকা লোড
$trips = $db->query("
    SELECT t.*, b.name as bus_name, b.bus_number, b.bus_type, b.total_seats,
           r.origin, r.destination,
           (SELECT COUNT(*) FROM booking_seats WHERE trip_id = t.id) as booked_seats,
           (SELECT COUNT(*) FROM user_bus_assignments WHERE trip_id = t.id) as assigned_operators
    FROM trips t
    JOIN buses b ON t.bus_id = b.id
    JOIN routes r ON t.route_id = r.id
    ORDER BY t.journey_date DESC, t.departure_time ASC
")->fetchAll();
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-calendar-check-fill text-primary me-2"></i>বাস ট্রিপ শিডিউল ও তালিকা
        </h4>
        <span class="text-muted small">বাস ও রুটের তারিখভিত্তিক ট্রিপ তৈরি ও সিট ভাড়া নির্ধারণ</span>
    </div>
    <div>
        <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#newTripModal">
            <i class="bi bi-plus-circle me-1"></i> নতুন ট্রিপ তৈরি করুন
        </button>
    </div>
</div>

<div class="card shadow-sm">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-dark small">
                    <tr>
                        <th>বাস ও নম্বর</th>
                        <th>রুট</th>
                        <th>যাত্রার তারিখ ও সময়</th>
                        <th>বোর্ডিং ও ড্রপিং</th>
                        <th class="text-end">সিট ভাড়া</th>
                        <th class="text-center">বুকড / মোট সিট</th>
                        <th class="text-center">স্ট্যাটাস</th>
                        <th class="text-center">অ্যাকশন</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($trips)): ?>
                        <tr><td colspan="8" class="text-center p-4 text-muted">কোনো ট্রিপ পাওয়া যায়নি।</td></tr>
                    <?php else: ?>
                        <?php foreach ($trips as $t): 
                            $free_seats = $t['total_seats'] - $t['booked_seats'];
                        ?>
                            <tr>
                                <td>
                                    <div class="fw-bold text-dark"><?= htmlspecialchars($t['bus_name']) ?></div>
                                    <span class="badge bg-light text-dark border font-monospace"><?= htmlspecialchars($t['bus_number']) ?></span>
                                </td>
                                <td>
                                    <strong class="text-primary"><?= htmlspecialchars($t['origin']) ?> → <?= htmlspecialchars($t['destination']) ?></strong>
                                </td>
                                <td>
                                    <div class="fw-semibold text-dark"><?= format_bn_date($t['journey_date']) ?></div>
                                    <span class="text-muted small"><i class="bi bi-clock me-1"></i><?= format_bn_time($t['departure_time']) ?></span>
                                </td>
                                <td class="small">
                                    <div><strong>বোর্ডিং:</strong> <?= htmlspecialchars($t['boarding_point']) ?></div>
                                    <div class="text-muted"><strong>ড্রপিং:</strong> <?= htmlspecialchars($t['dropping_point']) ?></div>
                                </td>
                                <td class="text-end font-monospace fw-bold text-success">
                                    <?= format_taka($t['seat_fare']) ?>
                                </td>
                                <td class="text-center font-monospace">
                                    <span class="badge <?= $free_seats > 0 ? 'bg-success' : 'bg-danger' ?>">
                                        <?= en2bn($t['booked_seats']) ?> / <?= en2bn($t['total_seats']) ?>
                                    </span>
                                    <div class="text-muted" style="font-size:0.75rem;">খালি: <?= en2bn($free_seats) ?>টি</div>
                                </td>
                                <td class="text-center">
                                    <?php if ($t['status'] === 'scheduled'): ?>
                                        <span class="badge bg-primary-subtle text-primary">শিডিউলড</span>
                                    <?php elseif ($t['status'] === 'departed'): ?>
                                        <span class="badge bg-warning-subtle text-warning">ছেড়ে গেছে</span>
                                    <?php elseif ($t['status'] === 'completed'): ?>
                                        <span class="badge bg-success-subtle text-success">সম্পন্ন</span>
                                    <?php else: ?>
                                        <span class="badge bg-danger-subtle text-danger">বাতিল</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm">
                                        <a href="<?= BASE_URL ?>/new-booking.php?trip_id=<?= $t['id'] ?>" class="btn btn-outline-success" title="বুকিং করুন">
                                            <i class="bi bi-ticket-perforated"></i>
                                        </a>
                                        <a href="<?= BASE_URL ?>/admin/manifest.php?trip_id=<?= $t['id'] ?>" target="_blank" class="btn btn-outline-dark" title="যাত্রী তালিকা ও ওয়েবিল">
                                            <i class="bi bi-card-checklist"></i>
                                        </a>
                                        <a href="<?= BASE_URL ?>/admin/expenses.php?trip_id=<?= $t['id'] ?>" class="btn btn-outline-danger" title="ট্রিপ খরচ ও লাভ">
                                            <i class="bi bi-fuel-pump"></i>
                                        </a>
                                        <button class="btn btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#editTripModal<?= $t['id'] ?>" title="এডিট">
                                            <i class="bi bi-pencil-square"></i>
                                        </button>
                                        <a href="<?= BASE_URL ?>/admin/assignments.php?trip_id=<?= $t['id'] ?>" class="btn btn-outline-info" title="অপারেটর অ্যাসাইন">
                                            <i class="bi bi-person-check"></i>
                                        </a>
                                    </div>

                                    <!-- ট্রিপ এডিট মোডাল -->
                                    <div class="modal fade text-start" id="editTripModal<?= $t['id'] ?>" tabindex="-1">
                                        <div class="modal-dialog">
                                            <div class="modal-content">
                                                <form method="POST" action="">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="action" value="edit_trip">
                                                    <input type="hidden" name="trip_id" value="<?= $t['id'] ?>">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title fw-bold">ট্রিপ সম্পাদন</h5>
                                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                                    </div>
                                                    <div class="modal-body">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">ছাড়ার সময়</label>
                                                            <input type="time" name="departure_time" class="form-control" value="<?= htmlspecialchars($t['departure_time']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">বোর্ডিং পয়েন্ট</label>
                                                            <input type="text" name="boarding_point" class="form-control" value="<?= htmlspecialchars($t['boarding_point']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">ড্রপিং পয়েন্ট</label>
                                                            <input type="text" name="dropping_point" class="form-control" value="<?= htmlspecialchars($t['dropping_point']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">প্রতি সিট ভাড়া (টাকা)</label>
                                                            <input type="number" step="any" name="seat_fare" class="form-control font-monospace" value="<?= (float)$t['seat_fare'] ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">স্ট্যাটাস</label>
                                                            <select name="status" class="form-select">
                                                                <option value="scheduled" <?= $t['status'] === 'scheduled' ? 'selected' : '' ?>>শিডিউলড (Scheduled)</option>
                                                                <option value="departed" <?= $t['status'] === 'departed' ? 'selected' : '' ?>>ছেড়ে গেছে (Departed)</option>
                                                                <option value="completed" <?= $t['status'] === 'completed' ? 'selected' : '' ?>>সম্পন্ন (Completed)</option>
                                                                <option value="cancelled" <?= $t['status'] === 'cancelled' ? 'selected' : '' ?>>বাতিল (Cancelled)</option>
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

<!-- নতুন ট্রিপ তৈরি মোডাল -->
<div class="modal fade" id="newTripModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="POST" action="">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="create_trip">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-calendar-plus me-2"></i>নতুন ট্রিপ তৈরি করুন</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">বাস নির্বাচন করুন <span class="text-danger">*</span></label>
                            <select name="bus_id" class="form-select" required>
                                <option value="">-- বাস সিলেক্ট করুন --</option>
                                <?php foreach ($buses as $b): ?>
                                    <option value="<?= $b['id'] ?>"><?= htmlspecialchars($b['name']) ?> (<?= htmlspecialchars($b['bus_number']) ?>)</option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">রুট নির্বাচন করুন <span class="text-danger">*</span></label>
                            <select name="route_id" class="form-select" required>
                                <option value="">-- রুট সিলেক্ট করুন --</option>
                                <?php foreach ($routes as $rt): ?>
                                    <option value="<?= $rt['id'] ?>"><?= htmlspecialchars($rt['origin']) ?> → <?= htmlspecialchars($rt['destination']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">যাত্রার তারিখ <span class="text-danger">*</span></label>
                            <input type="date" name="journey_date" class="form-control" value="<?= date('Y-m-d') ?>" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">ছাড়ার সময় <span class="text-danger">*</span></label>
                            <input type="time" name="departure_time" class="form-control" value="22:00" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">পৌঁছানোর আনুমানিক সময়</label>
                            <input type="time" name="arrival_time" class="form-control" value="04:00">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">প্রতি সিট ভাড়া (টাকা) <span class="text-danger">*</span></label>
                            <input type="number" step="any" name="seat_fare" class="form-control font-monospace fw-bold" placeholder="যেমন: 750" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">বোর্ডিং পয়েন্ট (Boarding Point)</label>
                            <input type="text" name="boarding_point" class="form-control" placeholder="যেমন: কল্যাণপুর / গাবতলী কাউন্টার" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">ড্রপিং পয়েন্ট (Dropping Point)</label>
                            <input type="text" name="dropping_point" class="form-control" placeholder="যেমন: মজমপুর গেট, কুষ্টিয়া" required>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বাতিল</button>
                    <button type="submit" class="btn btn-success fw-bold">ট্রিপ সংরক্ষণ করুন</button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
