<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ফুটার টেমপ্লেট (Footer Template)
 */
?>
    </div> <!-- .container-fluid -->
</div> <!-- .main-wrapper -->

<?php if (is_logged_in()): ?>
<footer class="bg-white border-top py-3 mt-auto no-print">
    <div class="container-fluid px-lg-4 d-flex flex-column flex-sm-row justify-content-between align-items-center text-muted small">
        <div>
            &copy; <?= en2bn(date('Y')) ?> <strong>বাসগো</strong> - বাস রিজার্ভেশন ও ম্যানেজমেন্ট সিস্টেম। সর্বস্বত্ব সংরক্ষিত।
        </div>
        <div class="mt-2 mt-sm-0">
            <span>সহায়তায়: <?= htmlspecialchars(get_setting('company_phone', '০১৭০০-০০০০০০')) ?></span>
            <span class="mx-2">|</span>
            <span class="text-success"><i class="bi bi-shield-check"></i> নিরাপদ সিস্টেম</span>
        </div>
    </div>
</footer>
<?php endif; ?>

<!-- Bootstrap 5 Bundle with Popper JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<!-- কাস্টম জাভাস্ক্রিপ্ট -->
<script src="<?= BASE_URL ?>/assets/js/app.js"></script>
</body>
</html>
