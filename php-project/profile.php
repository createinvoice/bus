<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ব্যবহারকারীর প্রোফাইল ও পাসওয়ার্ড পরিবর্তন
 */

$page_title = 'প্রোফাইল সেটিংস - বাসগো';
require_once __DIR__ . '/includes/header.php';
require_login();

$user_id = current_user_id();
$admin_mode = is_admin();
$db = get_db();

if ($admin_mode) {
    $stmt = $db->prepare("SELECT name, username, email, phone, created_at FROM admins WHERE id = ?");
} else {
    $stmt = $db->prepare("SELECT name, username, email, phone, counter_name, role, created_at FROM users WHERE id = ?");
}
$stmt->execute([$user_id]);
$user = $stmt->fetch();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();

    $current_pass = $_POST['current_password'] ?? '';
    $new_pass = $_POST['new_password'] ?? '';
    $confirm_pass = $_POST['confirm_password'] ?? '';

    if (empty($current_pass) || empty($new_pass)) {
        set_flash('danger', 'দয়া করে বর্তমান এবং নতুন পাসওয়ার্ড প্রদান করুন।');
    } elseif ($new_pass !== $confirm_pass) {
        set_flash('danger', 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি!');
    } elseif (strlen($new_pass) < 6) {
        set_flash('danger', 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
    } else {
        // বর্তমান পাসওয়ার্ড ভেরিফিকেশন
        $tbl = $admin_mode ? 'admins' : 'users';
        $v_stmt = $db->prepare("SELECT password FROM {$tbl} WHERE id = ?");
        $v_stmt->execute([$user_id]);
        $stored_hash = $v_stmt->fetchColumn();

        if (!password_verify($current_pass, $stored_hash)) {
            set_flash('danger', 'বর্তমান পাসওয়ার্ডটি সঠিক নয়!');
        } else {
            $new_hash = password_hash($new_pass, PASSWORD_BCRYPT);
            $upd = $db->prepare("UPDATE {$tbl} SET password = ? WHERE id = ?");
            $upd->execute([$new_hash, $user_id]);

            set_flash('success', 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
            header('Location: ' . BASE_URL . '/profile.php');
            exit;
        }
    }
}
?>

<div class="row justify-content-center">
    <div class="col-lg-8">
        <div class="card shadow-sm border-0 mb-4">
            <div class="card-header bg-dark text-white py-3">
                <h5 class="mb-0 fw-bold"><i class="bi bi-person-badge me-2"></i>আমার প্রোফাইল</h5>
            </div>
            <div class="card-body p-4">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label text-muted small mb-0">নাম</label>
                        <div class="fs-6 fw-bold"><?= htmlspecialchars($user['name']) ?></div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label text-muted small mb-0">ইউজারনেম</label>
                        <div class="fs-6 fw-bold font-monospace"><?= htmlspecialchars($user['username']) ?></div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label text-muted small mb-0">মোবাইল নম্বর</label>
                        <div class="fs-6 fw-bold"><?= htmlspecialchars($user['phone']) ?></div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label text-muted small mb-0">অ্যাকাউন্টের ধরন / রোল</label>
                        <div class="fs-6">
                            <span class="badge bg-primary"><?= $admin_mode ? 'সুপার অ্যাডমিন' : 'রিজার্ভেশন অপারেটর' ?></span>
                        </div>
                    </div>
                    <?php if (!$admin_mode): ?>
                        <div class="col-md-6">
                            <label class="form-label text-muted small mb-0">কাউন্টার</label>
                            <div class="fs-6 fw-bold text-success"><?= htmlspecialchars($user['counter_name'] ?? 'প্রধান কাউন্টার') ?></div>
                        </div>
                    <?php endif; ?>
                    <div class="col-md-6">
                        <label class="form-label text-muted small mb-0">অ্যাকাউন্ট তৈরির তারিখ</label>
                        <div class="fs-6 text-muted"><?= format_bn_date($user['created_at']) ?></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- পাসওয়ার্ড পরিবর্তন ফরম -->
        <div class="card shadow-sm border-0">
            <div class="card-header bg-white py-3">
                <h6 class="mb-0 fw-bold text-danger"><i class="bi bi-key-fill me-2"></i>পাসওয়ার্ড পরিবর্তন করুন</h6>
            </div>
            <div class="card-body p-4">
                <form method="POST" action="">
                    <?= csrf_field() ?>

                    <div class="mb-3">
                        <label class="form-label fw-bold">বর্তমান পাসওয়ার্ড</label>
                        <input type="password" name="current_password" class="form-control" required placeholder="আপনার বর্তমান পাসওয়ার্ড">
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">নতুন পাসওয়ার্ড</label>
                        <input type="password" name="new_password" class="form-control" minlength="6" required placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড">
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-bold">নতুন পাসওয়ার্ড নিশ্চিত করুন</label>
                        <input type="password" name="confirm_password" class="form-control" minlength="6" required placeholder="নতুন পাসওয়ার্ডটি পুনরায় লিখুন">
                    </div>

                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-save me-1"></i> পাসওয়ার্ড সংরক্ষণ করুন
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
