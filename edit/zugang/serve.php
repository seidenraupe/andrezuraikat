<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/redaktion/lib.php';

function az_esc(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function az_denied(): never
{
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Zugriff verweigert.';
    exit;
}

function az_page(string $title, string $inner): never
{
    header('Content-Type: text/html; charset=UTF-8');
    header('Cache-Control: no-store');
    echo '<!DOCTYPE html><html lang="de-CH"><head><meta charset="UTF-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<meta name="robots" content="noindex,nofollow"><title>' . az_esc($title) . '</title>';
    echo '<style>body{margin:0;font-family:Arial,sans-serif;background:#f7f1e8;color:#1a1714}main{max-width:28rem;margin:0 auto;padding:3rem 1.25rem}h1{font-size:1.9rem;margin:.2rem 0 .6rem}.kicker{color:#ff9b00;font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:.8rem}form, .card{background:#fffdf8;border:1px solid #e4d9c8;padding:1.1rem}label{font-weight:700;font-size:.95rem}input,button{font:inherit}input{width:100%;box-sizing:border-box;min-height:2.8rem;margin:.4rem 0 1rem;padding:.4rem .7rem}button,.btn{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:2.8rem;background:#ff9b00;color:#1a1714;border:0;font-weight:800;cursor:pointer;text-decoration:none;margin-top:.4rem}.ghost{background:transparent;box-shadow:inset 0 0 0 2px #003c69}.err{background:#fde8e8;color:#7f1d1d;padding:.7rem .9rem}.muted{color:#5c564e}</style>';
    echo '</head><body><main>' . $inner . '</main></body></html>';
    exit;
}

function az_login_form(string $error, string $step, string $email): never
{
    $inner = '<p class="kicker">André Zuraikat</p><h1>Redaktions-Modus</h1>';
    $inner .= '<p class="muted">Nur hinterlegte E-Mail-Adressen erhalten einen sechsstelligen Code. Der Zugang gilt bis Mitternacht. Danach wählen Sie Redaktion oder Freigabe.</p>';
    if ($error !== '') {
        $inner .= '<p class="err">' . az_esc($error) . '</p>';
    }
    $inner .= '<form method="post">';
    if ($step === 'code') {
        $inner .= '<input type="hidden" name="az_step" value="code"><input type="hidden" name="email" value="' . az_esc($email) . '">';
        $inner .= '<p class="muted">Code an <strong>' . az_esc($email) . '</strong>, falls die Adresse berechtigt ist. Gültig bis Mitternacht.</p>';
        $inner .= '<label for="code">Code aus der E-Mail</label><input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>';
        $inner .= '<button type="submit">Weiter</button>';
    } else {
        $inner .= '<input type="hidden" name="az_step" value="email">';
        $inner .= '<label for="email">E-Mail-Adresse</label><input id="email" name="email" type="email" required autocomplete="email" value="' . az_esc($email) . '">';
        $inner .= '<button type="submit">Code senden</button>';
    }
    $inner .= '</form>';
    az_page('Redaktions-Modus — André Zuraikat', $inner);
}

function az_role_form(): never
{
    $email = az_identity() ?? '';
    $inner = '<p class="kicker">Angemeldet</p><h1>Wie möchten Sie arbeiten?</h1>';
    $inner .= '<p class="muted">' . az_esc($email) . ' — die Wahl gilt bis Mitternacht.</p>';
    $inner .= '<form method="post"><input type="hidden" name="az_step" value="role">';
    $inner .= '<button type="submit" name="role" value="redaktion">Als Redaktion</button>';
    $inner .= '<button class="ghost" type="submit" name="role" value="freigabe">Als Freigabe</button>';
    $inner .= '</form>';
    $inner .= '<p class="muted">Redaktion speichert Entwürfe. Freigabe schaltet Texte live und vergibt weitere E-Mail-Zugänge.</p>';
    az_page('Rolle wählen — André Zuraikat', $inner);
}

function az_rel(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $base = az_base();
    if ($base !== '' && str_starts_with($uri, $base)) {
        $uri = substr($uri, strlen($base)) ?: '/';
    }
    $rel = '/' . ltrim($uri, '/');
    if (str_ends_with($rel, '/')) {
        $rel .= 'index.html';
    }
    return $rel;
}

function az_inject_editor(string $html): string
{
    az_boot_session();
    $base = az_base();
    $config = json_encode([
        'role' => az_role(),
        'email' => az_identity(),
        'csrf' => $_SESSION['csrf'] ?? '',
        'api' => $base . '/redaktion/api.php',
        'access' => $base . '/redaktion/zugang.php',
        'logout' => $base . '/?logout=1',
        'roleSwitch' => $base . '/?rolle=1',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $tag = '<script>window.AZ_EDIT=' . $config . ';</script><script src="' . az_esc($base) . '/js/edit-mode.js"></script>';
    if (str_contains($html, '</body>')) {
        return str_replace('</body>', $tag . '</body>', $html);
    }
    return $html . $tag;
}

function az_dispatch(): void
{
    $rel = az_rel();
    if (str_contains($rel, '..') || str_contains($rel, "\0")) {
        az_denied();
    }
    $blocked = [
        '/redaktion/lib.php',
        '/redaktion/config.mail.php',
        '/redaktion/storage/',
        '/storage/',
    ];
    foreach ($blocked as $prefix) {
        if ($rel === rtrim($prefix, '/') || str_starts_with($rel, $prefix)) {
            az_denied();
        }
    }
    $full = az_site_root() . $rel;
    if (str_starts_with($rel, '/redaktion/') || str_starts_with($rel, '/js/edit-mode.js')) {
        $full = AZ_ROOT . $rel;
    }
    if (!is_file($full)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=UTF-8');
        echo 'Nicht gefunden.';
        exit;
    }
    $realSite = realpath(az_site_root());
    $realEdit = realpath(AZ_ROOT);
    $real = realpath($full);
    $allowed = ($realSite && $real && str_starts_with($real, $realSite))
        || ($realEdit && $real && str_starts_with($real, $realEdit));
    if (!$allowed) {
        az_denied();
    }
    if (str_ends_with(strtolower($real), '.php')) {
        chdir(dirname($real));
        require $real;
        return;
    }
    $ext = strtolower(pathinfo($real, PATHINFO_EXTENSION));
    $map = [
        'html' => 'text/html; charset=UTF-8',
        'css' => 'text/css; charset=UTF-8',
        'js' => 'text/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        'woff2' => 'font/woff2',
        'mp4' => 'video/mp4',
        'ico' => 'image/x-icon',
    ];
    header('Content-Type: ' . ($map[$ext] ?? 'application/octet-stream'));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    if ($ext === 'html' && az_role() !== null) {
        echo az_inject_editor((string) file_get_contents($real));
        return;
    }
    readfile($real);
}

if (($_GET['logout'] ?? '') === '1') {
    az_clear_login();
    header('Location: ' . (az_base() === '' ? '/' : az_base() . '/'), true, 302);
    exit;
}
if (($_GET['rolle'] ?? '') === '1' && az_identity() !== null) {
    az_clear_cookie('az_rolle');
    header('Location: ' . (az_base() === '' ? '/' : az_base() . '/'), true, 302);
    exit;
}

$error = '';
$step = 'email';
$email = az_normalize_email((string) ($_POST['email'] ?? ''));

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $posted = (string) ($_POST['az_step'] ?? '');
    if ($posted === 'email') {
        usleep(200000);
        if (az_email_allowed($email)) {
            try {
                $code = az_otp_issue($email);
                az_send_access_code($email, $code);
            } catch (Throwable $e) {
                $error = $e->getMessage();
            }
        }
        if ($error === '') {
            $step = 'code';
        }
    } elseif ($posted === 'code') {
        usleep(200000);
        $code = (string) ($_POST['code'] ?? '');
        if (az_email_allowed($email) && az_otp_verify($email, $code)) {
            az_boot_session();
            session_regenerate_id(true);
            az_set_identity($email);
            header('Location: ' . (az_base() === '' ? '/' : az_base() . '/'), true, 302);
            exit;
        }
        $error = 'Code ungültig oder abgelaufen.';
        $step = 'code';
    } elseif ($posted === 'role' && az_identity() !== null) {
        $role = (string) ($_POST['role'] ?? '');
        if (in_array($role, ['redaktion', 'freigabe'], true)) {
            az_boot_session();
            az_set_role($role);
            header('Location: ' . (az_base() === '' ? '/' : az_base() . '/'), true, 302);
            exit;
        }
    }
}

if (az_identity() === null) {
    az_login_form($error, $step, $email);
}
if (az_role() === null) {
    az_role_form();
}
az_dispatch();
