<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * নতুন টিকিট রিজার্ভেশন পেজ (New Reservation & Seat Booking)
 */

$page_title = 'নতুন টিকিট বুকিং - বাসগো';
require_once __DIR__ . '/includes/header.php';
require_login();

$user_id = current_user_id();
$admin_mode = is_admin();
$db = get_db();

// ১. ব্যবহারকারীর জন্য অনুমোদিত ট্রিপসমূহ লোড
if ($admin_mode) {
    // অ্যাডমিন সব ট্রিপ দেখতে পারবে
    $trips_query = "
        SELECT t.id, t.journey_date, t.departure_time, t.boarding_point, t.dropping_point, t.seat_fare,
               b.name as bus_name, b.bus_number, b.bus_type, b.total_seats,
               r.origin, r.destination
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        JOIN routes r ON t.route_id = r.id
        WHERE t.status = 'scheduled'
        ORDER BY t.journey_date ASC, t.departure_time ASC
    ";
    $trips_stmt = $db->query($trips_query);
    $available_trips = $trips_stmt->fetchAll();
} else {
    // অপারেটর শুধুমাত্র তার জন্য নির্ধারিত ট্রিপ বা নির্ধারিত বাসের ট্রিপ দেখতে পারবে
    $trips_query = "
        SELECT DISTINCT t.id, t.journey_date, t.departure_time, t.boarding_point, t.dropping_point, t.seat_fare,
               b.name as bus_name, b.bus_number, b.bus_type, b.total_seats,
               r.origin, r.destination
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        JOIN routes r ON t.route_id = r.id
        JOIN user_bus_assignments uba ON (uba.bus_id = b.id OR uba.trip_id = t.id)
        WHERE uba.user_id = ? AND t.status = 'scheduled'
        ORDER BY t.journey_date ASC, t.departure_time ASC
    ";
    $trips_stmt = $db->prepare($trips_query);
    $trips_stmt->execute([$user_id]);
    $available_trips = $trips_stmt->fetchAll();
}

$selected_trip_id = isset($_GET['trip_id']) ? (int)$_GET['trip_id'] : 0;
if ($selected_trip_id === 0 && !empty($available_trips)) {
    $selected_trip_id = (int)$available_trips[0]['id'];
}

// সিলেক্টেড ট্রিপ ভেরিফিকেশন ও ডেটা লোড
$current_trip = null;
if ($selected_trip_id > 0) {
    if (!can_access_trip($selected_trip_id, $user_id, $admin_mode)) {
        set_flash('danger', 'এই ট্রিপে বুকিং করার অনুমতি আপনার নেই!');
        header('Location: ' . BASE_URL . '/new-booking.php');
        exit;
    }

    $t_stmt = $db->prepare("
        SELECT t.*, b.name as bus_name, b.bus_number, b.bus_type, b.total_seats,
               r.origin, r.destination
        FROM trips t
        JOIN buses b ON t.bus_id = b.id
        JOIN routes r ON t.route_id = r.id
        WHERE t.id = ?
    ");
    $t_stmt->execute([$selected_trip_id]);
    $current_trip = $t_stmt->fetch();
}

// এই ট্রিপের ইতিমধ্যে বুক হওয়া সিট তালিকা বের করা
$booked_seats = [];
if ($current_trip) {
    $bs_stmt = $db->prepare("SELECT seat_number FROM booking_seats WHERE trip_id = ?");
    $bs_stmt->execute([$selected_trip_id]);
    $booked_seats = $bs_stmt->fetchAll(PDO::FETCH_COLUMN);

    // বাসের সিট লিস্ট লোড
    $seat_config_stmt = $db->prepare("SELECT seat_number, status FROM bus_seats WHERE bus_id = ? ORDER BY seat_row ASC, seat_column ASC");
    $seat_config_stmt->execute([$current_trip['bus_id']]);
    $configured_seats = $seat_config_stmt->fetchAll(PDO::FETCH_KEY_PAIR);
}

// বুকিং সাবমিশন প্রসেসিং (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'confirm_booking') {
    check_csrf();

    $trip_id = (int)($_POST['trip_id'] ?? 0);
    $customer_name = trim($_POST['customer_name'] ?? '');
    $customer_phone = trim($_POST['customer_phone'] ?? '');
    $customer_nid = trim($_POST['customer_nid'] ?? '');
    $customer_address = trim($_POST['customer_address'] ?? '');
    $selected_seats_raw = trim($_POST['selected_seats'] ?? '');
    $advance_paid = (float)($_POST['advance_paid'] ?? 0);
    $payment_method = trim($_POST['payment_method'] ?? 'নগদ');
    $payment_note = trim($_POST['payment_note'] ?? '');

    $seats_array = array_filter(array_map('trim', explode(',', $selected_seats_raw)));

    if (!$current_trip || $trip_id !== (int)$current_trip['id']) {
        set_flash('danger', 'অবৈধ ট্রিপ নির্বাচন!');
    } elseif (empty($customer_name) || empty($customer_phone)) {
        set_flash('danger', 'দয়া করে যাত্রীর নাম এবং মোবাইল নম্বর প্রদান করুন।');
    } elseif (empty($seats_array)) {
        set_flash('danger', 'কমপক্ষে একটি সিট নির্বাচন করতে হবে!');
    } else {
        // ডেটাবেস ট্রানজ্যাকশন শুরু (ACID Transaction)
        $db->beginTransaction();
        try {
            // ১. পুনরায় চেক করা যে কোনো সিট ইতিমধ্যে অন্য কেউ বুক করেছে কিনা (Row lock simulation)
            $placeholders = implode(',', array_fill(0, count($seats_array), '?'));
            $check_sql = "SELECT seat_number FROM booking_seats WHERE trip_id = ? AND seat_number IN ($placeholders) FOR UPDATE";
            $params = array_merge([$trip_id], $seats_array);
            $chk_stmt = $db->prepare($check_sql);
            $chk_stmt->execute($params);
            $already_taken = $chk_stmt->fetchAll(PDO::FETCH_COLUMN);

            if (!empty($already_taken)) {
                $db->rollBack();
                $taken_str = implode(', ', $already_taken);
                set_flash('danger', "দুঃখিত! সিট ({$taken_str}) ইতিমধ্যে অন্য কোনো কাউন্টার থেকে বুক হয়ে গেছে। অন্য সিট নির্বাচন করুন।");
                header("Location: " . BASE_URL . "/new-booking.php?trip_id=" . $trip_id);
                exit;
            }

            // ২. মোট ভাড়া হিসাব
            $per_seat_fare = (float)$current_trip['seat_fare'];
            $total_seats = count($seats_array);
            $total_fare = $total_seats * $per_seat_fare;

            if ($advance_paid > $total_fare) {
                $advance_paid = $total_fare;
            }
            $due_amount = max(0, $total_fare - $advance_paid);

            $payment_status = 'unpaid';
            if ($advance_paid >= $total_fare) {
                $payment_status = 'paid';
            } elseif ($advance_paid > 0) {
                $payment_status = 'partial';
            }

            // ৩. ইউনিক বুকিং রেফারেন্স জেনারেশন (BUS-YYYYMMDD-XXXX)
            $booking_ref = generate_booking_reference($db);

            // ৪. বুকিং ইনসার্ট
            $ins_booking = $db->prepare("
                INSERT INTO bookings (
                    booking_reference, trip_id, user_id, customer_name, customer_phone, customer_nid, customer_address,
                    total_seats, total_fare, advance_paid, due_amount, booking_status, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
            ");
            $ins_booking->execute([
                $booking_ref, $trip_id, $user_id, $customer_name, $customer_phone, $customer_nid, $customer_address,
                $total_seats, $total_fare, $advance_paid, $due_amount, $payment_status
            ]);
            $booking_id = (int)$db->lastInsertId();

            // ৫. বুকিং সিট ও প্যাসেঞ্জার ইনসার্ট
            $ins_seat = $db->prepare("INSERT INTO booking_seats (booking_id, trip_id, seat_number, fare) VALUES (?, ?, ?, ?)");
            $ins_pass = $db->prepare("INSERT INTO booking_passengers (booking_id, seat_number, passenger_name, passenger_phone) VALUES (?, ?, ?, ?)");

            foreach ($seats_array as $st) {
                $ins_seat->execute([$booking_id, $trip_id, $st, $per_seat_fare]);

                // অতিরিক্ত প্যাসেঞ্জার নাম চেক
                $pass_name = trim($_POST['passenger_name_' . $st] ?? '');
                $pass_phone = trim($_POST['passenger_phone_' . $st] ?? '');
                if (empty($pass_name)) $pass_name = $customer_name;
                if (empty($pass_phone)) $pass_phone = $customer_phone;

                $ins_pass->execute([$booking_id, $st, $pass_name, $pass_phone]);
            }

            // ৬. পেমেন্ট রেকর্ড ইনসার্ট (যদি অগ্রিম দেওয়া হয়)
            if ($advance_paid > 0) {
                $pay_type = ($advance_paid >= $total_fare) ? 'full_payment' : 'advance';
                $ins_payment = $db->prepare("
                    INSERT INTO payments (booking_id, user_id, amount, payment_type, payment_method, note)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $ins_payment->execute([
                    $booking_id, $user_id, $advance_paid, $pay_type, $payment_method, $payment_note
                ]);
            }

            // ৭. ট্রানজ্যাকশন সফল - Commit
            $db->commit();

            set_flash('success', "বুকিং সফলভাবে সম্পন্ন হয়েছে! বুকিং আইডি: {$booking_ref}");
            header("Location: " . BASE_URL . "/ticket.php?id=" . $booking_id);
            exit;

        } catch (Exception $e) {
            $db->rollBack();
            set_flash('danger', 'বুকিং সংরক্ষণে ত্রুটি ঘটেছে: ' . $e->getMessage());
        }
    }
}
?>

<div class="d-flex justify-content-between align-items-center mb-3">
    <div>
        <h4 class="fw-bold mb-0 text-dark">
            <i class="bi bi-ticket-perforated-fill text-success me-2"></i>যাত্রী সিট বুকিং
        </h4>
        <span class="text-muted small">ট্রিপ নির্বাচন করে পছন্দমতো সিট বুক করুন এবং টিকিট প্রিন্ট করুন</span>
    </div>
    <div>
        <a href="<?= BASE_URL ?>/bookings.php" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-list-ul me-1"></i> বুকিং তালিকা
        </a>
    </div>
</div>

<!-- ট্রিপ সিলেক্টর বার -->
<div class="card shadow-sm mb-4 border-0">
    <div class="card-body bg-white p-3 rounded">
        <form method="GET" action="" class="row g-2 align-items-center">
            <div class="col-md-3">
                <label class="form-label small fw-bold text-secondary mb-1">
                    <i class="bi bi-bus-front me-1"></i>ট্রিপ নির্বাচন করুন:
                </label>
            </div>
            <div class="col-md-7">
                <select name="trip_id" class="form-select form-select-lg fw-semibold" onchange="this.form.submit()">
                    <?php if (empty($available_trips)): ?>
                        <option value="">কোনো সক্রিয় ট্রিপ পাওয়া যায়নি</option>
                    <?php else: ?>
                        <?php foreach ($available_trips as $at): ?>
                            <option value="<?= $at['id'] ?>" <?= $at['id'] == $selected_trip_id ? 'selected' : '' ?>>
                                <?= htmlspecialchars($at['bus_name']) ?> (<?= htmlspecialchars($at['bus_number']) ?>) | 
                                <?= htmlspecialchars($at['origin']) ?> → <?= htmlspecialchars($at['destination']) ?> | 
                                তারিখ: <?= format_bn_date($at['journey_date']) ?> (<?= format_bn_time($at['departure_time']) ?>) | 
                                ভাড়া: ৳<?= en2bn((int)$at['seat_fare']) ?>
                            </option>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary w-100 py-2">
                    <i class="bi bi-arrow-repeat me-1"></i> লোড করুন
                </button>
            </div>
        </form>
    </div>
</div>

<?php if (!$current_trip): ?>
    <div class="alert alert-warning text-center p-4">
        <i class="bi bi-exclamation-circle fs-3 d-block mb-2"></i>
        কোনো ট্রিপ পাওয়া যায়নি। অনুগ্রহ করে অ্যাডমিন প্যানেল থেকে ট্রিপ অ্যাসাইন করুন অথবা সক্রিয় করুন।
    </div>
<?php else: ?>

<!-- ট্রিপ ইনফো বার -->
<div class="alert alert-success-subtle border border-success-subtle mb-4">
    <div class="row align-items-center g-2 text-dark">
        <div class="col-md-3">
            <span class="text-muted small d-block">বাসের নাম:</span>
            <strong><?= htmlspecialchars($current_trip['bus_name']) ?></strong> (<?= htmlspecialchars($current_trip['bus_number']) ?>)
        </div>
        <div class="col-md-3">
            <span class="text-muted small d-block">রুট:</span>
            <strong><?= htmlspecialchars($current_trip['origin']) ?></strong> হতে <strong><?= htmlspecialchars($current_trip['destination']) ?></strong>
        </div>
        <div class="col-md-3">
            <span class="text-muted small d-block">যাত্রার সময়:</span>
            <strong><?= format_bn_date($current_trip['journey_date']) ?>, <?= format_bn_time($current_trip['departure_time']) ?></strong>
        </div>
        <div class="col-md-3 text-md-end">
            <span class="text-muted small d-block">প্রতি সিট ভাড়া:</span>
            <span class="fs-5 fw-bold text-success font-monospace"><?= format_taka($current_trip['seat_fare']) ?></span>
            <input type="hidden" id="per_seat_fare_val" value="<?= (float)$current_trip['seat_fare'] ?>">
        </div>
    </div>
</div>

<form method="POST" action="" id="busBookingForm">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="confirm_booking">
    <input type="hidden" name="trip_id" value="<?= $current_trip['id'] ?>">
    <input type="hidden" name="selected_seats" id="selected_seats_input" value="">
    <input type="hidden" name="total_fare" id="total_fare_input" value="0">
    <input type="hidden" name="due_amount" id="due_amount_input" value="0">

    <div class="row g-4">
        <!-- বাম পাশে: সিট লেআউট মানচিত্র -->
        <div class="col-lg-5">
            <div class="card shadow-sm h-100">
                <div class="card-header bg-white py-3">
                    <h6 class="mb-0 fw-bold text-dark text-center">
                        <i class="bi bi-grid-3x3-gap-fill text-success me-1"></i> বাসের সিট নির্বাচন করুন (২ x ২ লেআউট)
                    </h6>
                </div>
                <div class="card-body">
                    <!-- লিজেন্ড -->
                    <div class="d-flex justify-content-center gap-3 mb-3 pb-2 border-bottom">
                        <div class="seat-legend-item">
                            <span class="seat-legend-color border bg-white"></span> খালি সিট
                        </div>
                        <div class="seat-legend-item">
                            <span class="seat-legend-color bg-success"></span> নির্বাচিত
                        </div>
                        <div class="seat-legend-item">
                            <span class="seat-legend-color bg-danger"></span> বুকড
                        </div>
                    </div>

                    <!-- বাসের দৃশ্যমান লেআউট (৪০ সিট: A1-A4 থেকে J1-J4) -->
                    <div class="bus-container">
                        <!-- সামনের অংশ ও ড্রাইভার -->
                        <div class="bus-front">
                            <div>
                                <i class="bi bi-door-open-fill me-1"></i> প্রবেশদ্বার
                            </div>
                            <div class="bus-driver-wheel" title="ড্রাইভারের আসন">
                                <i class="bi bi-steering-wheel fs-5"></i>
                            </div>
                        </div>

                        <!-- ১০টি সারি (Row A to J) -->
                        <?php
                        $rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                        foreach ($rows as $r_idx => $r_char):
                        ?>
                            <div class="seat-row">
                                <!-- বাম পাশের জোড়া (১ ও ২) -->
                                <div class="seat-pair">
                                    <?php 
                                    foreach ([1, 2] as $col):
                                        $seat_code = $r_char . $col;
                                        $is_booked = in_array($seat_code, $booked_seats);
                                        $is_blocked = isset($configured_seats[$seat_code]) && $configured_seats[$seat_code] === 'blocked';
                                        
                                        $classes = ['seat-btn'];
                                        if ($is_booked) $classes[] = 'booked';
                                        if ($is_blocked) $classes[] = 'blocked';
                                    ?>
                                        <div class="<?= implode(' ', $classes) ?>" 
                                             data-seat="<?= $seat_code ?>" 
                                             title="<?= $is_booked ? 'বুকড' : ($is_blocked ? 'বন্ধ' : 'সিট ' . $seat_code) ?>">
                                            <?= $seat_code ?>
                                        </div>
                                    <?php endforeach; ?>
                                </div>

                                <!-- বাসের মাঝের হাঁটার পথ (Aisle) -->
                                <div class="seat-aisle"></div>

                                <!-- ডান পাশের জোড়া (৩ ও ৪) -->
                                <div class="seat-pair">
                                    <?php 
                                    foreach ([3, 4] as $col):
                                        $seat_code = $r_char . $col;
                                        $is_booked = in_array($seat_code, $booked_seats);
                                        $is_blocked = isset($configured_seats[$seat_code]) && $configured_seats[$seat_code] === 'blocked';
                                        
                                        $classes = ['seat-btn'];
                                        if ($is_booked) $classes[] = 'booked';
                                        if ($is_blocked) $classes[] = 'blocked';
                                    ?>
                                        <div class="<?= implode(' ', $classes) ?>" 
                                             data-seat="<?= $seat_code ?>" 
                                             title="<?= $is_booked ? 'বুকড' : ($is_blocked ? 'বন্ধ' : 'সিট ' . $seat_code) ?>">
                                            <?= $seat_code ?>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- ডান পাশে: যাত্রী তথ্য ও পেমেন্ট হিসাব -->
        <div class="col-lg-7">
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-white py-3">
                    <h6 class="mb-0 fw-bold text-dark">
                        <i class="bi bi-person-lines-fill text-primary me-2"></i>যাত্রী ও যোগাযোগের তথ্য
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">যাত্রীর নাম <span class="text-danger">*</span></label>
                            <input type="text" name="customer_name" class="form-control" placeholder="যেমন: মোঃ তানভীর হাসান" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">মোবাইল নম্বর <span class="text-danger">*</span></label>
                            <input type="tel" name="customer_phone" id="customer_phone" class="form-control" placeholder="01XXXXXXXXX" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">জাতীয় পরিচয়পত্র / NID (ঐচ্ছিক)</label>
                            <input type="text" name="customer_nid" class="form-control" placeholder="NID বা জন্ম নিবন্ধন নম্বর">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">ঠিকানা / বোর্ডিং স্পট (ঐচ্ছিক)</label>
                            <input type="text" name="customer_address" class="form-control" placeholder="যেমন: গাবতলী কাউন্টার থেকে উঠবেন">
                        </div>
                    </div>

                    <!-- একাধিক যাত্রীর অতিরিক্ত ফিল্ড কন্টেইনার -->
                    <div id="passenger_details_container" class="mt-3"></div>
                </div>
            </div>

            <!-- পেমেন্ট ও অগ্রিম কালেকশন সেকশন -->
            <div class="card shadow-sm border-0">
                <div class="card-header bg-success text-white py-3">
                    <h6 class="mb-0 fw-bold">
                        <i class="bi bi-cash-stack me-2"></i>ভাড়া ও অগ্রিম আদায় (Payment Calculation)
                    </h6>
                </div>
                <div class="card-body bg-white">
                    <div class="table-responsive mb-3">
                        <table class="table table-bordered align-middle">
                            <tr class="table-light">
                                <td class="fw-bold" style="width: 45%;">নির্বাচিত সিট:</td>
                                <td class="fw-bold text-primary fs-5" id="selected_seats_display">
                                    কোনো সিট নির্বাচিত হয়নি
                                </td>
                            </tr>
                            <tr>
                                <td class="fw-bold">মোট ভাড়া (Total Fare):</td>
                                <td class="fs-4 fw-bold text-dark font-monospace" id="total_fare_display">
                                    ৳ ০
                                </td>
                            </tr>
                            <tr class="table-info-subtle">
                                <td class="fw-bold">
                                    <label for="advance_paid" class="form-label mb-0">অগ্রিম গ্রহণ (Advance Paid):</label>
                                    <div class="text-muted small" style="font-size:0.75rem;">কাউন্টারে এখন প্রাপ্ত টাকা দিন</div>
                                </td>
                                <td>
                                    <div class="input-group">
                                        <span class="input-group-text bg-white fw-bold">৳</span>
                                        <input type="number" step="any" min="0" name="advance_paid" id="advance_paid" class="form-control form-control-lg fw-bold text-success font-monospace" value="0">
                                    </div>
                                </td>
                            </tr>
                            <tr class="table-danger-subtle">
                                <td class="fw-bold">বাকি টাকা (Remaining Due):</td>
                                <td class="fs-4 fw-bold text-danger font-monospace" id="due_amount_display">
                                    ৳ ০
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">পেমেন্ট মাধ্যম (Payment Method)</label>
                            <select name="payment_method" class="form-select">
                                <option value="নগদ" selected>নগদ (Cash)</option>
                                <option value="বিকাশ">বিকাশ (bKash)</option>
                                <option value="নগদ (Nagad)">নগদ (Nagad)</option>
                                <option value="রকেট">রকেট (Rocket)</option>
                                <option value="ব্যাংক">ব্যাংক ট্রান্সফার</option>
                                <option value="অন্যান্য">অন্যান্য</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">পেমেন্ট নোট / রেফারেন্স (ঐচ্ছিক)</label>
                            <input type="text" name="payment_note" class="form-control" placeholder="যেমন: TrxID বা রশিদ নম্বর">
                        </div>
                    </div>

                    <div class="mt-4 pt-3 border-top d-flex gap-2">
                        <button type="submit" class="btn btn-success btn-lg flex-grow-1 shadow">
                            <i class="bi bi-check-circle-fill me-2"></i>বুকিং নিশ্চিত করুন ও টিকিট প্রিন্ট করুন
                        </button>
                        <a href="<?= BASE_URL ?>/new-booking.php?trip_id=<?= $current_trip['id'] ?>" class="btn btn-outline-danger btn-lg">
                            <i class="bi bi-x-circle"></i> রিসেট
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>

<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
