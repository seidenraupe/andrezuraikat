<?php
/**
 * Redaktion André Zuraikat: E-Mail-Code, Rollen, Textspeicher.
 * Zugang unter /edit/ — Vorbild hvwinterthur.ch.
 */

declare(strict_types=1);

define('AZ_ROOT', dirname(__DIR__));
define('AZ_STORAGE', __DIR__ . '/storage');
define('AZ_ACCESS_FILE', AZ_STORAGE . '/access-emails.json');
define('AZ_OTP_FILE', AZ_STORAGE . '/otp.json');
define('AZ_SECRET_FILE', AZ_STORAGE . '/zugang-secret.txt');
define('AZ_DRAFT_FILE', AZ_STORAGE . '/content-draft.json');
define('AZ_MAIL_CONFIG', __DIR__ . '/config.mail.php');
define('AZ_TZ', 'Europe/Zurich');
define('AZ_ALLOWED_TAGS', ['strong', 'em', 'u', 'br', 'a']);

function az_seed_emails(): array
{
    return [
        'thomas.giger@cloud-7.net',
        'nicole.straehl@cloud-7.net',
    ];
}

function az_base(): string
{
    $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/edit/zugang/serve.php'));
    $base = preg_replace('#/zugang/serve\.php$#', '', $script);
    return is_string($base) ? rtrim($base, '/') : '';
}

function az_cookie_path(): string
{
    $base = az_base();
    return ($base === '' ? '' : $base) . '/';
}

function az_site_root(): string
{
    if (is_file(AZ_ROOT . '/index.html')) {
        return AZ_ROOT;
    }
    $dist = dirname(AZ_ROOT) . '/dist';
    if (is_file($dist . '/index.html')) {
        return $dist;
    }
    return AZ_ROOT;
}

function az_timezone(): DateTimeZone
{
    return new DateTimeZone(AZ_TZ);
}

function az_day_end(?int $now = null): int
{
    $nowDt = (new DateTimeImmutable('@' . ($now ?? time())))->setTimezone(az_timezone());
    return $nowDt->modify('tomorrow')->setTime(0, 0, 0)->getTimestamp();
}

function az_boot_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_name('az_edit');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => az_cookie_path(),
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
}

function az_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function az_read_json(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function az_write_json(string $path, array $data): void
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('JSON konnte nicht geschrieben werden.');
    }
    file_put_contents($path, $json . "\n", LOCK_EX);
}

function az_normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function az_mail_config(): array
{
    $defaults = [
        'host' => '',
        'port' => 587,
        'user' => '',
        'pass' => '',
        'secure' => 'tls',
        'from' => 'noreply@andrezuraikat.ch',
        'from_name' => 'André Zuraikat',
    ];
    if (!is_file(AZ_MAIL_CONFIG)) {
        return $defaults;
    }
    $cfg = require AZ_MAIL_CONFIG;
    return is_array($cfg) ? array_merge($defaults, $cfg) : $defaults;
}

function az_access_emails(): array
{
    $data = az_read_json(AZ_ACCESS_FILE);
    $stored = $data['emails'] ?? null;
    $emails = az_seed_emails();
    if (is_array($stored)) {
        foreach ($stored as $item) {
            $emails[] = (string) $item;
        }
    }
    $out = [];
    foreach ($emails as $item) {
        $n = az_normalize_email($item);
        if ($n !== '' && filter_var($n, FILTER_VALIDATE_EMAIL)) {
            $out[] = $n;
        }
    }
    return array_values(array_unique($out));
}

function az_write_access_emails(array $emails): void
{
    $clean = [];
    foreach ($emails as $item) {
        $n = az_normalize_email((string) $item);
        if ($n !== '' && filter_var($n, FILTER_VALIDATE_EMAIL) && !in_array($n, az_seed_emails(), true)) {
            $clean[] = $n;
        }
    }
    az_write_json(AZ_ACCESS_FILE, [
        'updatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'emails' => array_values(array_unique($clean)),
    ]);
}

function az_email_allowed(string $email): bool
{
    $n = az_normalize_email($email);
    return $n !== '' && in_array($n, az_access_emails(), true);
}

function az_is_seed(string $email): bool
{
    return in_array(az_normalize_email($email), az_seed_emails(), true);
}

function az_secret(): string
{
    if (is_file(AZ_SECRET_FILE)) {
        $secret = trim((string) file_get_contents(AZ_SECRET_FILE));
        if ($secret !== '') {
            return $secret;
        }
    }
    $secret = bin2hex(random_bytes(32));
    $dir = dirname(AZ_SECRET_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    file_put_contents(AZ_SECRET_FILE, $secret, LOCK_EX);
    return $secret;
}

function az_sign(string $payload): string
{
    return hash_hmac('sha256', $payload, az_secret());
}

function az_set_cookie(string $name, string $payload, int $exp): void
{
    $value = rtrim(strtr(base64_encode($payload . '|' . az_sign($payload)), '+/', '-_'), '=');
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie($name, $value, [
        'expires' => $exp,
        'path' => az_cookie_path(),
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function az_clear_cookie(string $name): void
{
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    setcookie($name, '', [
        'expires' => time() - 3600,
        'path' => az_cookie_path(),
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function az_read_cookie(string $name, int $parts): ?array
{
    $raw = $_COOKIE[$name] ?? '';
    if ($raw === '') {
        return null;
    }
    $pad = strlen($raw) % 4;
    if ($pad) {
        $raw .= str_repeat('=', 4 - $pad);
    }
    $decoded = base64_decode(strtr($raw, '-_', '+/'), true);
    if (!is_string($decoded)) {
        return null;
    }
    $bits = explode('|', $decoded);
    if (count($bits) !== $parts + 1) {
        return null;
    }
    $sig = array_pop($bits);
    $payload = implode('|', $bits);
    if (!hash_equals(az_sign($payload), (string) $sig)) {
        return null;
    }
    return $bits;
}

function az_session_valid(int $exp, ?int $now = null): bool
{
    $now = $now ?? time();
    return $exp > $now && $exp === az_day_end($now);
}

function az_set_identity(string $email): void
{
    $exp = az_day_end();
    $email = az_normalize_email($email);
    az_set_cookie('az_zugang', $exp . '|' . $email, $exp);
    az_clear_cookie('az_rolle');
}

function az_set_role(string $role): void
{
    $email = az_identity();
    if ($email === null || !in_array($role, ['redaktion', 'freigabe'], true)) {
        return;
    }
    $exp = az_day_end();
    az_set_cookie('az_rolle', $exp . '|' . $email . '|' . $role, $exp);
}

function az_identity(): ?string
{
    $bits = az_read_cookie('az_zugang', 2);
    if ($bits === null || !ctype_digit($bits[0]) || !az_session_valid((int) $bits[0])) {
        return null;
    }
    $email = az_normalize_email($bits[1]);
    return az_email_allowed($email) ? $email : null;
}

function az_role(): ?string
{
    $email = az_identity();
    if ($email === null) {
        return null;
    }
    $bits = az_read_cookie('az_rolle', 3);
    if ($bits === null || !ctype_digit($bits[0]) || !az_session_valid((int) $bits[0])) {
        return null;
    }
    if (az_normalize_email($bits[1]) !== $email) {
        return null;
    }
    return in_array($bits[2], ['redaktion', 'freigabe'], true) ? $bits[2] : null;
}

function az_clear_login(): void
{
    az_clear_cookie('az_zugang');
    az_clear_cookie('az_rolle');
}

function az_otp_issue(string $email): string
{
    $email = az_normalize_email($email);
    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $data = az_read_json(AZ_OTP_FILE);
    $now = time();
    $last = (int) ($data[$email]['sentAt'] ?? 0);
    if ($last && ($now - $last) < 60) {
        throw new RuntimeException('Bitte eine Minute warten, bevor Sie einen neuen Code anfordern.');
    }
    $hourCount = (int) ($data[$email]['hourCount'] ?? 0);
    $hourStart = (int) ($data[$email]['hourStart'] ?? 0);
    if ($hourStart < $now - 3600) {
        $hourCount = 0;
        $hourStart = $now;
    }
    if ($hourCount >= 5) {
        throw new RuntimeException('Zu viele Codes. Bitte später erneut versuchen.');
    }
    $data[$email] = [
        'hash' => password_hash($code, PASSWORD_DEFAULT),
        'exp' => az_day_end($now),
        'tries' => 0,
        'sentAt' => $now,
        'hourCount' => $hourCount + 1,
        'hourStart' => $hourStart,
    ];
    az_write_json(AZ_OTP_FILE, $data);
    return $code;
}

function az_otp_verify(string $email, string $code): bool
{
    $email = az_normalize_email($email);
    $code = preg_replace('/\D+/', '', $code) ?? '';
    if (strlen($code) !== 6) {
        return false;
    }
    $data = az_read_json(AZ_OTP_FILE);
    $row = $data[$email] ?? null;
    if (!is_array($row) || (int) ($row['exp'] ?? 0) < time()) {
        return false;
    }
    $tries = (int) ($row['tries'] ?? 0);
    if ($tries >= 5) {
        unset($data[$email]);
        az_write_json(AZ_OTP_FILE, $data);
        return false;
    }
    $ok = password_verify($code, (string) ($row['hash'] ?? ''));
    if ($ok) {
        unset($data[$email]);
        az_write_json(AZ_OTP_FILE, $data);
        return true;
    }
    $data[$email]['tries'] = $tries + 1;
    az_write_json(AZ_OTP_FILE, $data);
    return false;
}

function az_send_access_code(string $email, string $code): void
{
    $cfg = az_mail_config();
    $subject = 'Ihr Zugangscode — André Zuraikat';
    $body = "Guten Tag\n\nIhr Code für den Redaktions-Modus lautet:\n\n  {$code}\n\nEr gilt bis Mitternacht (Schweizer Zeit) und kann nur einmal verwendet werden.\n\nWenn Sie diesen Code nicht angefordert haben, ignorieren Sie die Nachricht.\n\nAndré Zuraikat\n";
    if ((string) $cfg['host'] !== '' && (string) $cfg['user'] !== '' && (string) $cfg['pass'] !== '') {
        az_smtp_send($cfg, $email, $subject, $body);
        return;
    }
    $from = (string) $cfg['from'];
    $fromName = (string) $cfg['from_name'];
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . sprintf('"%s" <%s>', addcslashes($fromName, '"\\'), $from),
    ];
    $ok = @mail($email, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));
    if (!$ok) {
        throw new RuntimeException('E-Mail konnte nicht gesendet werden. SMTP in edit/redaktion/config.mail.php prüfen.');
    }
}

function az_smtp_expect($fp, array $ok): string
{
    $data = '';
    while (!feof($fp)) {
        $line = fgets($fp, 1024);
        if ($line === false) {
            break;
        }
        $data .= $line;
        if (preg_match('/^\d{3} /', $line)) {
            break;
        }
    }
    $code = (int) substr($data, 0, 3);
    if (!in_array($code, $ok, true)) {
        throw new RuntimeException('Mailserver: unerwartete Antwort (' . trim($data) . ').');
    }
    return $data;
}

function az_smtp_cmd($fp, string $cmd, array $ok): string
{
    fwrite($fp, $cmd . "\r\n");
    return az_smtp_expect($fp, $ok);
}

function az_smtp_send(array $cfg, string $to, string $subject, string $body): void
{
    $host = (string) $cfg['host'];
    $port = (int) $cfg['port'];
    $secure = (string) $cfg['secure'];
    $remote = ($secure === 'ssl') ? "ssl://{$host}:{$port}" : "tcp://{$host}:{$port}";
    $fp = @stream_socket_client($remote, $errno, $errstr, 20, STREAM_CLIENT_CONNECT);
    if (!$fp) {
        throw new RuntimeException("SMTP-Verbindung fehlgeschlagen ({$errstr}).");
    }
    stream_set_timeout($fp, 20);
    az_smtp_expect($fp, [220]);
    $ehlo = 'EHLO andrezuraikat.ch';
    az_smtp_cmd($fp, $ehlo, [250]);
    if ($secure === 'tls') {
        az_smtp_cmd($fp, 'STARTTLS', [220]);
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('SMTP STARTTLS fehlgeschlagen.');
        }
        az_smtp_cmd($fp, $ehlo, [250]);
    }
    az_smtp_cmd($fp, 'AUTH LOGIN', [334]);
    az_smtp_cmd($fp, base64_encode((string) $cfg['user']), [334]);
    az_smtp_cmd($fp, base64_encode((string) $cfg['pass']), [235]);
    az_smtp_cmd($fp, 'MAIL FROM:<' . $cfg['from'] . '>', [250]);
    az_smtp_cmd($fp, 'RCPT TO:<' . $to . '>', [250, 251]);
    az_smtp_cmd($fp, 'DATA', [354]);
    $msg = 'From: "' . addcslashes((string) $cfg['from_name'], '"\\') . '" <' . $cfg['from'] . ">\r\n";
    $msg .= 'To: <' . $to . ">\r\n";
    $msg .= 'Subject: =?UTF-8?B?' . base64_encode($subject) . "?=\r\n";
    $msg .= "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n";
    $msg .= str_replace("\n.", "\n..", str_replace("\r\n", "\n", $body)) . "\r\n.";
    fwrite($fp, $msg . "\r\n");
    az_smtp_expect($fp, [250]);
    az_smtp_cmd($fp, 'QUIT', [221, 250]);
    fclose($fp);
}

function az_fields(string $path): array
{
    $data = az_read_json($path);
    $fields = $data['fields'] ?? [];
    return is_array($fields) ? $fields : [];
}

function az_merged_fields(): array
{
    return array_merge(az_fields(az_site_root() . '/data/content-live.json'), az_fields(AZ_DRAFT_FILE));
}

function az_sanitize_rich(string $html): string
{
    $html = trim($html);
    if ($html === '') {
        return '';
    }
    if (strlen($html) > 8000) {
        throw new RuntimeException('Ein Text ist zu lang.');
    }
    $doc = new DOMDocument();
    $wrapped = '<?xml encoding="UTF-8"><div>' . $html . '</div>';
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML($wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);
    $root = $doc->getElementsByTagName('div')->item(0);
    if (!$root instanceof DOMElement) {
        return '';
    }
    az_sanitize_children($root);
    $out = '';
    foreach ($root->childNodes as $child) {
        $out .= $doc->saveHTML($child);
    }
    return trim($out);
}

function az_sanitize_children(DOMNode $parent): void
{
    $remove = [];
    foreach ($parent->childNodes as $child) {
        if ($child instanceof DOMText) {
            continue;
        }
        if (!$child instanceof DOMElement) {
            $remove[] = $child;
            continue;
        }
        $tag = strtolower($child->tagName);
        if (!in_array($tag, AZ_ALLOWED_TAGS, true)) {
            while ($child->firstChild) {
                $parent->insertBefore($child->firstChild, $child);
            }
            $remove[] = $child;
            continue;
        }
        if ($tag === 'a') {
            $href = trim($child->getAttribute('href'));
            if (!preg_match('#^(https?:|/|\./|\.\./|mailto:)#i', $href)) {
                $href = '';
            }
            while ($child->attributes->length) {
                $child->removeAttribute($child->attributes->item(0)->name);
            }
            if ($href !== '') {
                $child->setAttribute('href', $href);
            }
        } else {
            while ($child->attributes->length) {
                $child->removeAttribute($child->attributes->item(0)->name);
            }
        }
        az_sanitize_children($child);
    }
    foreach ($remove as $node) {
        if ($node->parentNode) {
            $parent->removeChild($node);
        }
    }
}

function az_save_draft(array $incoming): void
{
    $fields = az_fields(AZ_DRAFT_FILE);
    foreach ($incoming as $id => $html) {
        if (!is_string($id) || !preg_match('/^[a-z0-9-]{1,80}$/', $id) || !is_string($html)) {
            continue;
        }
        $fields[$id] = az_sanitize_rich($html);
    }
    az_write_json(AZ_DRAFT_FILE, [
        'updatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'fields' => $fields,
    ]);
}

function az_publish(): void
{
    $live = az_fields(az_site_root() . '/data/content-live.json');
    foreach (az_fields(AZ_DRAFT_FILE) as $id => $html) {
        $live[$id] = $html;
    }
    $payload = [
        'updatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'fields' => $live,
    ];
    $targets = [az_site_root() . '/data/content-live.json'];
    $public = dirname(AZ_ROOT);
    if ($public !== az_site_root() && is_file($public . '/index.html')) {
        $targets[] = $public . '/data/content-live.json';
    }
    foreach (array_unique($targets) as $path) {
        az_write_json($path, $payload);
    }
    az_write_json(AZ_DRAFT_FILE, [
        'updatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'fields' => [],
    ]);
}
