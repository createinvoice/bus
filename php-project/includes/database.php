<?php
/**
 * বাসগো - বাস রিজার্ভেশন ম্যানেজমেন্ট সিস্টেম
 * ডেটাবেস কানেকশন হ্যান্ডলার (PDO Database Connection)
 */

require_once __DIR__ . '/config.php';

class Database {
    private static $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                DB_HOST,
                DB_NAME,
                DB_CHARSET
            );

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false
            ];

            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
                // নিশ্চিত করা যে UTF-8 এ ডেটা আদানপ্রদান হবে
                self::$instance->exec("SET NAMES 'utf8mb4'");
            } catch (PDOException $e) {
                // ব্রাউজারে পরিষ্কার ডায়াগনস্টিক বার্তা প্রদর্শন
                http_response_code(500);
                echo '<!DOCTYPE html><html lang="bn"><head><meta charset="UTF-8"><title>ডেটাবেস সংযোগ সমস্যা</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; }
                    .card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; border-top: 5px solid #dc2626; }
                    h2 { color: #dc2626; margin-top: 0; }
                    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #0f172a; font-size: 14px; }
                    .error-box { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 8px; margin: 16px 0; font-family: monospace; font-size: 13px; }
                    .step { margin-bottom: 12px; }
                </style></head><body>
                <div class="card">
                    <h2>⚠️ ডেটাবেস সংযোগ স্থাপন করা সম্ভব হয়নি!</h2>
                    <p>আপনার <code>includes/config.php</code> ফাইলের ডেটাবেস তথ্যে অমিল রয়েছে।</p>
                    <div class="error-box"><strong>MySQL Error:</strong> ' . htmlspecialchars($e->getMessage()) . '</div>
                    <h3>সহজ সমাধান:</h3>
                    <div class="step">১. cPanel <strong>File Manager</strong>-এ যান।</div>
                    <div class="step">২. <code>includes/config.php</code> ফাইলটি Edit করুন।</div>
                    <div class="step">৩. আপনার cPanel-এ তৈরি করা সঠিক Database Name, Username ও Password দিন:
                        <pre style="background:#f8fafc; padding:10px; border-radius:6px; font-size:12px;">define(\'DB_NAME\', \'' . htmlspecialchars(DB_NAME) . '\');
define(\'DB_USER\', \'' . htmlspecialchars(DB_USER) . '\');
define(\'DB_PASS\', \'আপনার_পাসওয়ার্ড\');</pre>
                    </div>
                    <div class="step">৪. cPanel MySQL-এ ব্যবহারকারীকে <strong>ALL PRIVILEGES</strong> দেওয়া হয়েছে কিনা নিশ্চিত করুন।</div>
                </div></body></html>';
                exit;
            }
        }

        return self::$instance;
    }
}

// গ্লোবাল পিডিও অবজেক্টের শর্টকাট
function get_db(): PDO {
    return Database::getConnection();
}
