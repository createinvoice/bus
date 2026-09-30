<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * হেডার টেমপ্লেট (Header Template)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/auth.php';

$page_title = $page_title ?? 'বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম';
$current_page = basename($_SERVER['PHP_SELF']);
$is_admin_area = (strpos($_SERVER['PHP_SELF'], '/admin/') !== false);
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?></title>
    <!-- Google Fonts: Noto Sans Bengali -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <!-- কাস্টম সিএসএস -->
    <link rel="stylesheet" href="<?= BASE_URL ?>/assets/css/style.css">
</head>
<body class="bg-light">

<?php if (is_logged_in()): ?>
    <!-- টপ নেভিগেশন বার -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-2 no-print">
        <div class="container-fluid px-lg-4">
            <a class="navbar-brand d-flex items-center fw-bold text-success fs-4 me-3" href="<?= is_admin() ? BASE_URL . '/admin/index.php' : BASE_URL . '/dashboard.php' ?>">
                <i class="bi bi-bus-front me-2"></i> বাসগো
            </a>
            
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#busgoNav" aria-controls="busgoNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="busgoNav">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <?php if (is_admin()): ?>
                        <!-- সুপার অ্যাডমিন মেন্যু -->
                        <li class="nav-item">
                            <a class="nav-link <?= $current_page === 'index.php' && $is_admin_area ? 'active fw-bold' : '' ?>" href="<?= BASE_URL ?>/admin/index.php">
                                <i class="bi bi-speedometer2 me-1"></i> ড্যাশবোর্ড
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?= $current_page === 'new-booking.php' ? 'active fw-bold text-warning' : 'text-warning' ?>" href="<?= BASE_URL ?>/new-booking.php">
                                <i class="bi bi-plus-circle-fill me-1"></i> নতুন বুকিং
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?= $current_page === 'bookings.php' && $is_admin_area ? 'active fw-bold' : '' ?>" href="<?= BASE_URL ?>/admin/bookings.php">
                                <i class="bi bi-ticket-perforated me-1"></i> সকল বুকিং
                            </a>
                        </li>
                        <li class="nav-item dropdown">
                            <a class="nav-link dropdown-toggle <?= in_array($current_page, ['buses.php', 'seats.php', 'routes.php', 'trips.php']) ? 'active fw-bold' : '' ?>" href="#" role="button" data-bs-toggle="dropdown">
                                <i class="bi bi-signpost-split me-1"></i> বাস ও ট্রিপ
                            </a>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="<?= BASE_URL ?>/admin/buses.php"><i class="bi bi-bus-front me-2"></i> বাসের তালিকা</a></li>
                                <li><a class="dropdown-item" href="<?= BASE_URL ?>/admin/routes.php"><i class="bi bi-geo-alt me-2"></i> রুট ব্যবস্থাপনা</a></li>
                                <li><a class="dropdown-item" href="<?= BASE_URL ?>/admin/trips.php"><i class="bi bi-calendar-event me-2"></i> ট্রিপ তালিকা</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="<?= BASE_URL ?>/admin/assignments.php"><i class="bi bi-person-check me-2"></i> বাস/ট্রিপ বরাদ্দ</a></li>
                                <li><a class="dropdown-item" href="<?= BASE_URL ?>/admin/expenses.php"><i class="bi bi-fuel-pump me-2"></i> ট্রিপ খরচ ও নিট লাভ</a></li>
                            </ul>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?= $current_page === 'users.php' ? 'active fw-bold' : '' ?>" href="<?= BASE_URL ?>/admin/users.php">
                                <i class="bi bi-people me-1"></i> ব্যবহারকারী
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?= $current_page === 'payments.php' ? 'active fw-bold' : '' ?>" href="<?= BASE_URL ?>/admin/payments.php">
                                <i class="bi bi-cash-stack me-1"></i> আদায় ও ক্লোজিং
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?= $current_page === 'reports.php' ? 'active fw-bold' : '' ?>" href="<?= BASE_URL ?>/admin/reports.php">
                                <i class="bi bi-file-earmark-bar-graph me-1"></i> রিপোর্ট
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link <?= $current_page === 'settings.php' ? 'active fw-bold' : '' ?>" href="<?= BASE_URL ?>/admin/settings.php">
                                <i class="bi bi-gear me-1"></i> সেটিংস
                            </a>
                        </li>
                    <?php else: ?>
                        <!-- রিজার্ভেশন অপারেটর মেন্যু -->
                        <li class="nav-item">
                            <a class="nav-link <?= $current_page === 'dashboard.php' ? 'active fw-bold' : '' ?>" href="<?= BASE_URL ?>/dashboard.php">
                                <i class="bi bi-speedometer2 me-1"></i> ড্যাশবোর্ড
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link btn btn-success btn-sm text-white px-3 ms-lg-2 <?= $current_page === 'new-booking.php' ? 'active' : '' ?>" href="<?= BASE_URL ?>/new-booking.php">
                                <i class="bi bi-plus-lg me-1"></i> নতুন টিকিট বুকিং
                            </a>
                        </li>
                        <li class="nav-item ms-lg-2">
                            <a class="nav-link <?= $current_page === 'bookings.php' ? 'active fw-bold' : '' ?>" href="<?= BASE_URL ?>/bookings.php">
                                <i class="bi bi-ticket-detailed me-1"></i> আমার বুকিং তালিকা
                            </a>
                        </li>
                    <?php endif; ?>
                </ul>

                <!-- ইউজার প্রোফাইল ও লগআউট বাটন -->
                <div class="d-flex align-items-center gap-2">
                    <div class="text-light small text-end d-none d-md-block">
                        <div class="fw-semibold"><?= htmlspecialchars(current_user_name()) ?></div>
                        <span class="badge bg-secondary"><?= is_admin() ? 'সুপার অ্যাডমিন' : 'অপারেটর' ?></span>
                    </div>
                    <a href="<?= BASE_URL ?>/profile.php" class="btn btn-outline-light btn-sm" title="প্রোফাইল">
                        <i class="bi bi-person-circle"></i>
                    </a>
                    <a href="<?= BASE_URL ?>/logout.php" class="btn btn-danger btn-sm" title="লগআউট">
                        <i class="bi bi-box-arrow-right me-1"></i> লগআউট
                    </a>
                </div>
            </div>
        </div>
    </nav>
<?php endif; ?>

<!-- মূল কনটেন্ট কন্টেইনার -->
<div class="main-wrapper py-4">
    <div class="container-fluid px-lg-4">
        <!-- ফ্ল্যাশ নোটিফিকেশন প্রদর্শন -->
        <?= display_flash() ?>
