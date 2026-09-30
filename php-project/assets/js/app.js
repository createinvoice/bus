/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ক্লায়েন্ট-সাইড ইন্টারঅ্যাকশন ও সিট সিলেকশন লজিক
 */

document.addEventListener('DOMContentLoaded', function () {
    // সিট বুকিং পেজের উপাদানসমূহ
    const seatButtons = document.querySelectorAll('.seat-btn:not(.booked):not(.blocked)');
    const selectedSeatsInput = document.getElementById('selected_seats_input');
    const selectedSeatsDisplay = document.getElementById('selected_seats_display');
    const totalFareDisplay = document.getElementById('total_fare_display');
    const totalFareInput = document.getElementById('total_fare_input');
    const advancePaidInput = document.getElementById('advance_paid');
    const dueAmountDisplay = document.getElementById('due_amount_display');
    const dueAmountInput = document.getElementById('due_amount_input');
    const passengerDetailsContainer = document.getElementById('passenger_details_container');
    const perSeatFareElement = document.getElementById('per_seat_fare_val');

    let selectedSeats = [];
    const perSeatFare = perSeatFareElement ? parseFloat(perSeatFareElement.value || 0) : 0;

    function en2bn(number) {
        const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(number).replace(/[0-9]/g, d => bnDigits[d]);
    }

    // সিটে ক্লিক ইভেন্ট
    seatButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const seatNo = this.getAttribute('data-seat');

            if (selectedSeats.includes(seatNo)) {
                // আন-সিলেক্ট
                selectedSeats = selectedSeats.filter(s => s !== seatNo);
                this.classList.remove('selected');
            } else {
                // সিলেক্ট
                selectedSeats.push(seatNo);
                this.classList.add('selected');
            }

            updateBookingSummary();
        });
    });

    function updateBookingSummary() {
        if (!selectedSeatsInput) return;

        // হিডেন ইনপুটে সিট কমা দিয়ে রাখা
        selectedSeatsInput.value = selectedSeats.join(',');

        // ডিসপ্লে টেক্সট আপডেট
        if (selectedSeatsDisplay) {
            if (selectedSeats.length > 0) {
                selectedSeatsDisplay.textContent = selectedSeats.join(', ') + ' (' + en2bn(selectedSeats.length) + 'টি)';
            } else {
                selectedSeatsDisplay.textContent = 'কোনো সিট নির্বাচিত হয়নি';
            }
        }

        // মোট ভাড়া ক্যালকুলেশন
        const totalFare = selectedSeats.length * perSeatFare;
        if (totalFareDisplay) {
            totalFareDisplay.textContent = '৳ ' + en2bn(totalFare.toLocaleString());
        }
        if (totalFareInput) {
            totalFareInput.value = totalFare;
        }

        // অগ্রিম ভ্যালু চেক ও বাকি ক্যালকুলেট
        calculateDue(totalFare);

        // একাধিক যাত্রীর জন্য ইনপুট ফিল্ড তৈরি
        renderPassengerFields();
    }

    function calculateDue(totalFare) {
        if (!advancePaidInput || !dueAmountDisplay || !dueAmountInput) return;

        let advance = parseFloat(advancePaidInput.value || 0);
        if (isNaN(advance) || advance < 0) {
            advance = 0;
        }

        // অগ্রিম মোট ভাড়ার চেয়ে বেশি হতে পারে না
        if (advance > totalFare) {
            advance = totalFare;
            advancePaidInput.value = advance;
        }

        const due = Math.max(0, totalFare - advance);
        dueAmountDisplay.textContent = '৳ ' + en2bn(due.toLocaleString());
        dueAmountInput.value = due;
    }

    // অগ্রিম টাকা পরিবর্তনের সাথে সাথে বাকি আপডেট
    if (advancePaidInput) {
        advancePaidInput.addEventListener('input', function () {
            const total = totalFareInput ? parseFloat(totalFareInput.value || 0) : 0;
            calculateDue(total);
        });
    }

    // প্রতি সিটের জন্য যাত্রীর নাম-ফোন ইনপুট তৈরি
    function renderPassengerFields() {
        if (!passengerDetailsContainer) return;

        if (selectedSeats.length <= 1) {
            passengerDetailsContainer.innerHTML = '';
            return;
        }

        let html = '<div class="alert alert-info py-2 small mb-3"><i class="bi bi-info-circle me-1"></i> একাধিক সিটের যাত্রীদের বিবরণ দিন (ঐচ্ছিক):</div>';
        selectedSeats.forEach((seat, index) => {
            html += `
                <div class="row g-2 mb-2 p-2 border rounded bg-white">
                    <div class="col-md-3">
                        <span class="badge bg-secondary mb-1">সিট: ${seat}</span>
                    </div>
                    <div class="col-md-5">
                        <input type="text" name="passenger_name_${seat}" class="form-control form-control-sm" placeholder="যাত্রীর নাম (সিট ${seat})">
                    </div>
                    <div class="col-md-4">
                        <input type="tel" name="passenger_phone_${seat}" class="form-control form-control-sm" placeholder="মোবাইল নম্বর">
                    </div>
                </div>
            `;
        });

        passengerDetailsContainer.innerHTML = html;
    }

    // বুকিং ফর্ম সাবমিট ভ্যালিডেশন
    const bookingForm = document.getElementById('busBookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            if (selectedSeats.length === 0) {
                e.preventDefault();
                alert('দয়া করে অন্তত একটি সিট নির্বাচন করুন!');
                return false;
            }

            const phone = document.getElementById('customer_phone');
            if (phone && phone.value.trim().length < 11) {
                e.preventDefault();
                alert('দয়া করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx)।');
                phone.focus();
                return false;
            }
        });
    }
});

// সরাসরি টিকিট প্রিন্ট করার হেল্পার ফাংশন
function printTicket() {
    window.print();
}
