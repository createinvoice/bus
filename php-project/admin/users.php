<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ব্যবহারকারী ব্যবস্থাপনা পেজ (User & Operator Management)
 */

$page_title = 'ব্যবহারকারী ব্যবস্থাপনা - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

// ব্যবহারকারী তৈরি বা এডিট অ্যাকশন (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    check_csrf();

    $action = $_POST['action'];

    if ($action === 'create_user') {
        $name = trim($_POST['name'] ?? '');
        $username = trim($_POST['username'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $counter_name = trim($_POST['counter_name'] ?? 'প্রধান কাউন্টার');
        $role = trim($_POST['role'] ?? 'operator');
        $password = $_POST['password'] ?? '';

        if (empty($name) || empty($username) || empty($phone) || empty($password)) {
            set_flash('danger', 'দয়া করে সকল আবশ্যকীয় তথ্য পূরণ করুন।');
        } else {
            // ইউজারনেম ডুপ্লিকেট চেক
            $chk = $db->prepare("SELECT id FROM users WHERE username = ?");
            $chk->execute([$username]);
            if ($chk->fetch()) {
                set_flash('danger', 'এই ইউজারনেমটি ইতিমধ্যে বিদ্যমান! অন্য ইউজারনেম ব্যবহার করুন।');
            } else {
                $hash = password_hash($password, PASSWORD_BCRYPT);
                $ins = $db->prepare("
                    INSERT INTO users (name, username, phone, email, password, counter_name, role, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
                ");
                $ins->execute([$name, $username, $phone, $email, $hash, $counter_name, $role]);
                set_flash('success', "নতুন ব্যবহারকারী '{$name}' সফলভাবে তৈরি করা হয়েছে!");
                header('Location: ' . BASE_URL . '/admin/users.php');
                exit;
            }
        }
    } elseif ($action === 'edit_user') {
        $id = (int)($_POST['user_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $counter_name = trim($_POST['counter_name'] ?? '');
        $role = trim($_POST['role'] ?? 'operator');
        $status = trim($_POST['status'] ?? 'active');

        $upd = $db->prepare("
            UPDATE users SET name = ?, phone = ?, email = ?, counter_name = ?, role = ?, status = ?
            WHERE id = ?
        ");
        $upd->execute([$name, $phone, $email, $counter_name, $role, $status, $id]);
        set_flash('success', 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট করা হয়েছে।');
        header('Location: ' . BASE_URL . '/admin/users.php');
        exit;
    } elseif ($action === 'reset_password') {
        $id = (int)($_POST['user_id'] ?? 0);
        $new_pass = $_POST['new_password'] ?? '';

        if (strlen($new_pass) < 6) {
            set_flash('danger', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        } else {
            $hash = password_hash($new_pass, PASSWORD_BCRYPT);
            $upd = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
            $upd->execute([$hash, $id]);
            set_flash('success', 'পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!');
            header('Location: ' . BASE_URL . '/admin/users.php');
            exit;
        }
    }
}

// সকল অপারেটর ও স্টাফ তালিকা লোড
$users = $db->query("
    SELECT u.*, 
           (SELECT COUNT(*) FROM user_bus_assignments WHERE user_id = u.id) as assigned_buses_count,
           (SELECT COUNT(*) FROM bookings WHERE user_id = u.id) as total_bookings_made
    FROM users u
    ORDER BY u.id DESC
")->fetchAll();
?>

<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
    <div>
        <h4 class="fw-bold mb-1 text-dark">
            <i class="bi bi-people-fill text-primary me-2"></i>রিজার্ভেশন ব্যবহারকারী ও অপারেটর তালিকা
        </h4>
        <span class="text-muted small">কাউন্টার মাস্টার ও রিজার্ভেশন স্টাফ অ্যাকাউন্ট পরিচালনা করুন</span>
    </div>
    <div>
        <button type="button" class="btn btn-success" data-bs-toggle="modal" data-bs-target="#newUserModal">
            <i class="bi bi-person-plus-fill me-1"></i> নতুন ব্যবহারকারী তৈরি করুন
        </button>
    </div>
</div>

<div class="card shadow-sm">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead class="table-dark small">
                    <tr>
                        <th>নাম ও ইউজারনেম</th>
                        <th>কাউন্টার</th>
                        <th>মোবাইল নম্বর</th>
                        <th>বরাদ্দকৃত বাস</th>
                        <th>মোট বুকিং</th>
                        <th class="text-center">স্ট্যাটাস</th>
                        <th class="text-center">অ্যাকশন</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($users)): ?>
                        <tr><td colspan="7" class="text-center p-4 text-muted">কোনো ব্যবহারকারী পাওয়া যায়নি।</td></tr>
                    <?php else: ?>
                        <?php foreach ($users as $u): ?>
                            <tr>
                                <td>
                                    <div class="fw-bold text-dark"><?= htmlspecialchars($u['name']) ?></div>
                                    <span class="text-muted small font-monospace">@<?= htmlspecialchars($u['username']) ?></span>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark border">
                                        <i class="bi bi-geo-alt-fill text-danger me-1"></i><?= htmlspecialchars($u['counter_name']) ?>
                                    </span>
                                </td>
                                <td><?= htmlspecialchars($u['phone']) ?></td>
                                <td>
                                    <a href="<?= BASE_URL ?>/admin/assignments.php?user_id=<?= $u['id'] ?>" class="btn btn-sm btn-outline-info">
                                        <?= en2bn($u['assigned_buses_count']) ?>টি বরাদ্দ দেখুন
                                    </a>
                                </td>
                                <td class="font-monospace fw-bold text-primary"><?= en2bn($u['total_bookings_made']) ?>টি</td>
                                <td class="text-center">
                                    <?php if ($u['status'] === 'active'): ?>
                                        <span class="badge bg-success-subtle text-success">সক্রিয় (Active)</span>
                                    <?php else: ?>
                                        <span class="badge bg-danger-subtle text-danger">নিষ্ক্রিয় (Inactive)</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#editModal<?= $u['id'] ?>" title="এডিট">
                                            <i class="bi bi-pencil-square"></i>
                                        </button>
                                        <button class="btn btn-outline-warning text-dark" data-bs-toggle="modal" data-bs-target="#passModal<?= $u['id'] ?>" title="পাসওয়ার্ড রিসেট">
                                            <i class="bi bi-key"></i>
                                        </button>
                                        <a href="<?= BASE_URL ?>/admin/assignments.php?user_id=<?= $u['id'] ?>" class="btn btn-outline-success" title="বাস অ্যাসাইন করুন">
                                            <i class="bi bi-bus-front"></i>
                                        </a>
                                    </div>

                                    <!-- এডিট মোডাল -->
                                    <div class="modal fade text-start" id="editModal<?= $u['id'] ?>" tabindex="-1">
                                        <div class="modal-dialog">
                                            <div class="modal-content">
                                                <form method="POST" action="">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="action" value="edit_user">
                                                    <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title fw-bold">ব্যবহারকারী তথ্য এডিট</h5>
                                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                                    </div>
                                                    <div class="modal-body">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">নাম</label>
                                                            <input type="text" name="name" class="form-control" value="<?= htmlspecialchars($u['name']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">কাউন্টারের নাম</label>
                                                            <input type="text" name="counter_name" class="form-control" value="<?= htmlspecialchars($u['counter_name']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">মোবাইল নম্বর</label>
                                                            <input type="tel" name="phone" class="form-control" value="<?= htmlspecialchars($u['phone']) ?>" required>
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">ইমেইল (ঐচ্ছিক)</label>
                                                            <input type="email" name="email" class="form-control" value="<?= htmlspecialchars($u['email'] ?? '') ?>">
                                                        </div>
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">স্ট্যাটাস</label>
                                                            <select name="status" class="form-select">
                                                                <option value="active" <?= $u['status'] === 'active' ? 'selected' : '' ?>>সক্রিয় (Active)</option>
                                                                <option value="inactive" <?= $u['status'] === 'inactive' ? 'selected' : '' ?>>নিষ্ক্রিয় (Inactive)</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বন্ধ করুন</button>
                                                        <button type="submit" class="btn btn-primary">সংরক্ষণ করুন</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- পাসওয়ার্ড রিসেট মোডাল -->
                                    <div class="modal fade text-start" id="passModal<?= $u['id'] ?>" tabindex="-1">
                                        <div class="modal-dialog">
                                            <div class="modal-content">
                                                <form method="POST" action="">
                                                    <?= csrf_field() ?>
                                                    <input type="hidden" name="action" value="reset_password">
                                                    <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title fw-bold">পাসওয়ার্ড রিসেট: <?= htmlspecialchars($u['name']) ?></h5>
                                                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                                    </div>
                                                    <div class="modal-body">
                                                        <div class="mb-3">
                                                            <label class="form-label fw-bold">নতুন পাসওয়ার্ড</label>
                                                            <input type="password" name="new_password" class="form-control" placeholder="কমপক্ষে ৬ অক্ষর দিন" minlength="6" required>
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বাতিল</button>
                                                        <button type="submit" class="btn btn-warning">পাসওয়ার্ড রিসেট করুন</button>
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

<!-- নতুন ইউজার তৈরি মোডাল -->
<div class="modal fade" id="newUserModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <form method="POST" action="">
                <?= csrf_field() ?>
                <input type="hidden" name="action" value="create_user">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title fw-bold"><i class="bi bi-person-plus-fill me-2"></i>নতুন অপারেটর তৈরি করুন</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label fw-bold">পুরো নাম <span class="text-danger">*</span></label>
                        <input type="text" name="name" class="form-control" placeholder="যেমন: মোঃ জাহিদ হাসান" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">লগইন ইউজারনেম <span class="text-danger">*</span></label>
                        <input type="text" name="username" class="form-control font-monospace" placeholder="যেমন: jahid12" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">মোবাইল নম্বর <span class="text-danger">*</span></label>
                        <input type="tel" name="phone" class="form-control" placeholder="01XXXXXXXXX" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">কাউন্টারের নাম</label>
                        <input type="text" name="counter_name" class="form-control" placeholder="যেমন: গাবতলী কাউন্টার" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">ইমেইল (ঐচ্ছিক)</label>
                        <input type="email" name="email" class="form-control" placeholder="staff@example.com">
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold">লগইন পাসওয়ার্ড <span class="text-danger">*</span></label>
                        <input type="password" name="password" class="form-control" placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড" minlength="6" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">বাতিল</button>
                    <button type="submit" class="btn btn-success fw-bold">ব্যবহারকারী সংরক্ষণ করুন</button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
