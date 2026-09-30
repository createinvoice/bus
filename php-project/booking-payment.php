<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * বাকি টাকা আদায় পেজ (Due Collection & Payment Recording)
 */

$page_title = 'বাকি টাকা আদায় - বাসগো';
require_once __DIR__ . '/includes/header.php';
require_login();

$booking_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$user_id = current_user_id();
$admin_mode = is_admin();
$db = get_db();

if ($booking_id <= 0 || !can_access_booking($booking_id, $user_id, $admin_mode)) {
    set_flash('danger', 'অবৈধ বুকিং আইডি অথবা এক্সেস অধিকার নেই!');
    header('Location: ' . BASE_URL . '/bookings.php');
    exit;
}

// বুকিং তথ্য লোড
$stmt = $db->prepare("
    SELECT b.*, t.journey_date, t.departure_time, bus.name as bus_name, bus.bus_number, r.origin, r.destination
    FROM bookings b
    JOIN trips t ON b.trip_id = t.id
    JOIN buses bus ON t.bus_id = bus.id
    JOIN routes r ON t.route_id = r.id
    WHERE b.id = ?
");
$stmt->execute([$booking_id]);
$booking = $stmt->fetch();

if (!$booking) {
    set_flash('danger', 'বুকিং রেকর্ড পাওয়া যায়নি।');
    header('Location: ' . BASE_URL . '/bookings.php');
    exit;
}

if ($booking['booking_status'] === 'cancelled') {
    set_flash('danger', 'বাতিলকৃত বুকিংয়ের বাকি টাকা গ্রহণ করা সম্ভব নয়!');
    header('Location: ' . BASE_URL . '/booking-view.php?id=' . $booking_id);
    exit;
}

if ((float)$booking['due_amount'] <= 0) {
    set_flash('info', 'এই বুকিংয়ের কোনো বাকি টাকা নেই। সম্পূর্ণ পরিশোধিত!');
    header('Location: ' . BASE_URL . '/booking-view.php?id=' . $booking_id);
    exit;
}

// বাকি পেমেন্ট প্রসেসিং
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf();

    $collect_amount = (float)($_POST['collect_amount'] ?? 0);
    $payment_method = trim($_POST['payment_method'] ?? 'নগদ');
    $note = trim($_POST['payment_note'] ?? 'বাকি টাকা আদায়');

    $current_due = (float)$booking['due_amount'];

    if ($collect_amount <= 0) {
        set_flash('danger', 'দয়া করে আদায়ের পরিমাণ সঠিক দিন (০ টাকার বেশি)।');
    } elseif ($collect_amount > $current_due) {
        set_flash('danger', 'আদায়ের পরিমাণ অবশিষ্ট বাকি টাকার (' . format_taka($current_due) . ') চেয়ে বেশি হতে পারে না!');
    } else {
        $db->beginTransaction();
        try {
            // ১. পেমেন্টস টেবিলে নতুন লেনদেন ইনসার্ট
            $ins_pay = $db->prepare("
                INSERT INTO payments (booking_id, user_id, amount, payment_type, payment_method, note)
                VALUES (?, ?, ?, 'due_collection', ?, ?)
            ");
            $ins_pay->execute([$booking_id, $user_id, $collect_amount, $payment_method, $note]);

            // ২. বুকিংয়ের হিসাব আপডেট
            $new_advance_paid = (float)$booking['advance_paid'] + $collect_amount;
            $new_due_amount = max(0, (float)$booking['total_fare'] - $new_advance_paid);
            $new_payment_status = ($new_due_amount <= 0) ? 'paid' : 'partial';

            $upd_book = $db->prepare("
                UPDATE bookings 
                SET advance_paid = ?, due_amount = ?, payment_status = ? 
                WHERE id = ?
            ");
            $upd_book->execute([$new_advance_paid, $new_due_amount, $new_payment_status, $booking_id]);

            $db->commit();

            set_flash('success', 'বাকি টাকা ' . format_taka($collect_amount) . ' সফলভাবে আদায় করা হয়েছে!');
            header('Location: ' . BASE_URL . '/booking-view.php?id=' . $booking_id);
            exit;
        } catch (Exception $e) {
            $db->rollBack();
            set_flash('danger', 'পেমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে: ' . $e->getMessage());
        }
    }
}
?>

<div class="row justify-content-center">
    <div class="col-lg-6">
        <div class="card shadow-sm border-0">
            <div class="card-header bg-success text-white py-3">
                <h5 class="mb-0 fw-bold">
                    <i class="bi bi-cash-coin me-2"></i>বাকি টাকা গ্রহণ করুন (Due Collection)
                </h5>
            </div>
            <div class="card-body p-4">
                <!-- বুকিং ও যাত্রীর সংক্ষিপ্ত তথ্য -->
                <div class="bg-light p-3 rounded mb-4">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted small">বুকিং আইডি:</span>
                        <strong class="font-monospace text-primary"><?= htmlspecialchars($booking['booking_reference']) ?></strong>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted small">যাত্রীর নাম:</span>
                        <strong><?= htmlspecialchars($booking['customer_name']) ?></strong>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted small">মোবাইল নম্বর:</span>
                        <strong><?= htmlspecialchars($booking['customer_phone']) ?></strong>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="text-muted small">বাস ও রুট:</span>
                        <span><?= htmlspecialchars($booking['bus_name']) ?> (<?= htmlspecialchars($booking['origin']) ?> → <?= htmlspecialchars($booking['destination']) ?>)</span>
                    </div>
                </div>

                <!-- বর্তমান হিসাব পর্যালোচনা -->
                <table class="table table-bordered mb-4 align-middle">
                    <tr>
                        <td class="text-muted">মোট ভাড়া:</td>
                        <td class="text-end fw-bold font-monospace"><?= format_taka($booking['total_fare']) ?></td>
                    </tr>
                    <tr>
                        <td class="text-success">পূর্বে পরিশোধিত:</td>
                        <td class="text-end fw-bold text-success font-monospace"><?= format_taka($booking['advance_paid']) ?></td>
                    </tr>
                    <tr class="table-danger-subtle">
                        <td class="fw-bold text-danger">বর্তমান বাকি টাকা:</td>
                        <td class="text-end fs-5 fw-bold text-danger font-monospace"><?= format_taka($booking['due_amount']) ?></td>
                    </tr>
                </table>

                <form method="POST" action="">
                    <?= csrf_field() ?>

                    <div class="mb-3">
                        <label class="form-label fw-bold">
                            আদায়ের পরিমাণ (টাকা) <span class="text-danger">*</span>
                        </label>
                        <div class="input-group">
                            <span class="input-group-text bg-light fw-bold">৳</span>
                            <input type="number" step="any" min="1" max="<?= (float)$booking['due_amount'] ?>" 
                                   name="collect_amount" class="form-control form-control-lg fw-bold text-success font-monospace" 
                                   value="<?= (float)$booking['due_amount'] ?>" required autofocus>
                        </div>
                        <div class="form-text">যাত্রী যত টাকা প্রদান করেছেন তা লিখুন (সর্বোচ্চ বাকি টাকা পর্যন্ত)।</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-bold">পেমেন্ট মাধ্যম</label>
                        <select name="payment_method" class="form-select">
                            <option value="নগদ" selected>নগদ (Cash)</option>
                            <option value="বিকাশ">বিকাশ (bKash)</option>
                            <option value="নগদ (Nagad)">নগদ (Nagad)</option>
                            <option value="রকেট">রকেট (Rocket)</option>
                            <option value="ব্যাংক">ব্যাংক ট্রান্সফার</option>
                            <option value="অন্যান্য">অন্যান্য</option>
                        </select>
                    </div>

                    <div class="mb-4">
                        <label class="form-label fw-bold">মন্তব্য / ট্রানজ্যাকশন আইডি (ঐচ্ছিক)</label>
                        <input type="text" name="payment_note" class="form-control" placeholder="যেমন: কাউন্টারে নগদ বাকি পরিশোধ">
                    </div>

                    <div class="d-flex gap-2">
                        <button type="submit" class="btn btn-success btn-lg flex-grow-1 shadow-sm">
                            <i class="bi bi-check-lg me-1"></i> টাকা গ্রহণ নিশ্চিত করুন
                        </button>
                        <a href="<?= BASE_URL ?>/booking-view.php?id=<?= $booking['id'] ?>" class="btn btn-outline-secondary btn-lg">
                            বাতিল
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
