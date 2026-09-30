<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * সিস্টেম ও কোম্পানি সেটিংস পেজ (System Settings)
 */

$page_title = 'সিস্টেম সেটিংস - বাসগো';
require_once __DIR__ . '/../includes/header.php';
require_admin();

$db = get_db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();

    $settings_to_update = [
        'company_name' => trim($_POST['company_name'] ?? 'বাসগো পরিবহন লিমিটেড'),
        'company_tagline' => trim($_POST['company_tagline'] ?? ''),
        'company_phone' => trim($_POST['company_phone'] ?? ''),
        'company_email' => trim($_POST['company_email'] ?? ''),
        'company_address' => trim($_POST['company_address'] ?? ''),
        'currency_symbol' => trim($_POST['currency_symbol'] ?? '৳'),
        'ticket_terms' => trim($_POST['ticket_terms'] ?? ''),
        'ticket_footer_note' => trim($_POST['ticket_footer_note'] ?? '')
    ];

    $upd_stmt = $db->prepare("
        INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ");

    foreach ($settings_to_update as $key => $val) {
        $upd_stmt->execute([$key, $val]);
    }

    set_flash('success', 'সিস্টেম ও টিকিটের সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!');
    header('Location: ' . BASE_URL . '/admin/settings.php');
    exit;
}
?>

<div class="row justify-content-center">
    <div class="col-lg-9">
        <div class="card shadow-sm border-0 mb-4">
            <div class="card-header bg-dark text-white py-3">
                <h5 class="mb-0 fw-bold"><i class="bi bi-gear-fill me-2"></i>কোম্পানি ও টিকেট সেটিংস</h5>
            </div>
            <div class="card-body p-4">
                <form method="POST" action="">
                    <?= csrf_field() ?>

                    <div class="row g-3 mb-4">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">কোম্পানির নাম <span class="text-danger">*</span></label>
                            <input type="text" name="company_name" class="form-control" value="<?= htmlspecialchars(get_setting('company_name', 'বাসগো পরিবহন লিমিটেড')) ?>" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">ট্যাগলাইন / স্লোগান</label>
                            <input type="text" name="company_tagline" class="form-control" value="<?= htmlspecialchars(get_setting('company_tagline', 'নিরাপদ ও নির্ভরযোগ্য ভ্রমণ')) ?>">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">হটলাইন / হেল্পলাইন নম্বর</label>
                            <input type="text" name="company_phone" class="form-control" value="<?= htmlspecialchars(get_setting('company_phone', '০১৭০০-০০০০০০')) ?>">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">অফিসিয়াল ইমেইল</label>
                            <input type="email" name="company_email" class="form-control" value="<?= htmlspecialchars(get_setting('company_email', 'support@busgo.com.bd')) ?>">
                        </div>
                        <div class="col-md-8">
                            <label class="form-label fw-bold">হেড অফিস ঠিকানা</label>
                            <input type="text" name="company_address" class="form-control" value="<?= htmlspecialchars(get_setting('company_address', 'গাবতলী বাস টার্মিনাল, ঢাকা-১২১৬, বাংলাদেশ')) ?>">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold">কারেন্সি সিম্বল</label>
                            <input type="text" name="currency_symbol" class="form-control font-monospace" value="<?= htmlspecialchars(get_setting('currency_symbol', '৳')) ?>">
                        </div>
                    </div>

                    <h6 class="fw-bold text-primary border-bottom pb-2 mb-3">টিকিট প্রিন্ট ও শর্তাবলী সেটিংস</h6>

                    <div class="mb-3">
                        <label class="form-label fw-bold">টিকিটের শর্তাবলী (নোট)</label>
                        <textarea name="ticket_terms" class="form-control" rows="3"><?= htmlspecialchars(get_setting('ticket_terms', '১. যাত্রার অন্তত ৩০ মিনিট পূর্বে কাউন্টারে উপস্থিত থাকুন। ২. অগ্রিম বুকিংয়ের টিকিট পরিবর্তন যোগ্য নয়। ৩. বাকি টাকা বাসে ওঠার পূর্বে পরিশোধ করতে হবে।')) ?></textarea>
                        <div class="form-text">এই শর্তগুলো টিকিটের নিচের অংশে মুদ্রিত হবে।</div>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-bold">টিকিটের ফুটনোট (শুভেচ্ছা বার্তা)</label>
                        <input type="text" name="ticket_footer_note" class="form-control" value="<?= htmlspecialchars(get_setting('ticket_footer_note', 'ধন্যবাদ, আপনার যাত্রা শুভ ও নিরাপদ হোক।')) ?>">
                    </div>

                    <button type="submit" class="btn btn-success btn-lg shadow-sm">
                        <i class="bi bi-save me-1"></i> সেটিংস সংরক্ষণ করুন
                    </button>
                </form>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
