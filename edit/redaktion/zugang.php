<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

az_boot_session();
if (az_role() !== 'freigabe') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Nur mit der Rolle Freigabe.';
    exit;
}

$error = '';
$notice = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $sent = (string) ($_POST['csrf'] ?? '');
    if (!hash_equals((string) $_SESSION['csrf'], $sent)) {
        $error = 'Sitzung abgelaufen. Bitte Seite neu laden.';
    } else {
        $target = az_normalize_email((string) ($_POST['email'] ?? ''));
        $op = (string) ($_POST['op'] ?? '');
        try {
            $extra = az_read_json(AZ_ACCESS_FILE)['emails'] ?? [];
            if (!is_array($extra)) {
                $extra = [];
            }
            if ($op === 'add') {
                if (!filter_var($target, FILTER_VALIDATE_EMAIL)) {
                    throw new RuntimeException('Ungültige E-Mail-Adresse.');
                }
                $extra[] = $target;
                $notice = 'Zugang erteilt.';
            } elseif ($op === 'remove') {
                if (az_is_seed($target)) {
                    throw new RuntimeException('Diese Adresse ist fest hinterlegt.');
                }
                $extra = array_values(array_filter(
                    $extra,
                    static fn ($item): bool => az_normalize_email((string) $item) !== $target,
                ));
                $notice = 'Zugang entzogen.';
            }
            az_write_access_emails($extra);
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }
    }
}

$esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$base = az_base();
header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store');
?>
<!DOCTYPE html>
<html lang="de-CH">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Zugänge — Redaktion</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; background: #f7f1e8; color: #1a1714; }
    main { max-width: 36rem; margin: 0 auto; padding: 2.5rem 1.25rem; }
    h1 { font-size: 1.8rem; margin: 0.3rem 0 0.6rem; }
    .kicker { color: #ff9b00; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.8rem; }
    form, ul { background: #fffdf8; border: 1px solid #e4d9c8; padding: 1rem 1.1rem; }
    input, button { font: inherit; }
    input[type="email"] { width: 100%; box-sizing: border-box; min-height: 2.6rem; margin: 0.4rem 0 0.8rem; padding: 0.4rem 0.6rem; }
    button, .btn { background: #ff9b00; color: #1a1714; border: 0; font-weight: 800; min-height: 2.6rem; padding: 0 1rem; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
    .ghost { background: transparent; box-shadow: inset 0 0 0 2px #003c69; }
    li { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin: 0.45rem 0; }
    .err { background: #fde8e8; color: #7f1d1d; padding: 0.7rem 0.9rem; }
    .ok { background: #e8f6e8; padding: 0.7rem 0.9rem; }
    .muted { color: #5c564e; }
  </style>
</head>
<body>
  <main>
    <p class="kicker">Freigabe</p>
    <h1>E-Mail-Zugänge</h1>
    <p class="muted">Fest hinterlegte Adressen bleiben. Weitere Personen erhalten einen Code und wählen danach selbst Redaktion oder Freigabe.</p>
    <?php if ($error !== ''): ?><p class="err"><?php echo $esc($error); ?></p><?php endif; ?>
    <?php if ($notice !== ''): ?><p class="ok"><?php echo $esc($notice); ?></p><?php endif; ?>
    <ul>
      <?php foreach (az_access_emails() as $item): ?>
        <li>
          <span><?php echo $esc($item); ?><?php if (az_is_seed($item)): ?> <span class="muted">(fest)</span><?php endif; ?></span>
          <?php if (!az_is_seed($item)): ?>
            <form method="post">
              <input type="hidden" name="csrf" value="<?php echo $esc((string) $_SESSION['csrf']); ?>">
              <input type="hidden" name="op" value="remove">
              <input type="hidden" name="email" value="<?php echo $esc($item); ?>">
              <button class="ghost" type="submit">Entziehen</button>
            </form>
          <?php endif; ?>
        </li>
      <?php endforeach; ?>
    </ul>
    <form method="post">
      <input type="hidden" name="csrf" value="<?php echo $esc((string) $_SESSION['csrf']); ?>">
      <input type="hidden" name="op" value="add">
      <label for="email">Neue E-Mail-Adresse</label>
      <input id="email" name="email" type="email" required autocomplete="off">
      <button type="submit">Zugang erteilen</button>
    </form>
    <p><a class="btn" href="<?php echo $esc($base === '' ? '/' : $base . '/'); ?>">Zurück zur Bearbeitung</a></p>
  </main>
</body>
</html>
