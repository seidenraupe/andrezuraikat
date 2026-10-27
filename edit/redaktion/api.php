<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

az_boot_session();
$email = az_identity();
$role = az_role();
if ($email === null || $role === null) {
    az_json(['ok' => false, 'error' => 'Bitte anmelden.'], 401);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    az_json([
        'ok' => true,
        'email' => $email,
        'role' => $role,
        'csrf' => $_SESSION['csrf'],
        'fields' => az_merged_fields(),
    ]);
}

$sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
if (!hash_equals((string) $_SESSION['csrf'], $sent)) {
    az_json(['ok' => false, 'error' => 'Sitzung abgelaufen. Bitte Seite neu laden.'], 403);
}

$raw = json_decode((string) file_get_contents('php://input'), true);
$body = is_array($raw) ? $raw : [];
$action = (string) ($body['action'] ?? '');

try {
    if ($action === 'save') {
        $fields = $body['fields'] ?? null;
        if (!is_array($fields)) {
            az_json(['ok' => false, 'error' => 'Keine Texte.'], 400);
        }
        az_save_draft($fields);
        az_json(['ok' => true, 'role' => $role]);
    }
    if ($action === 'publish') {
        if ($role !== 'freigabe') {
            az_json(['ok' => false, 'error' => 'Nur die Freigabe kann live schalten.'], 403);
        }
        az_publish();
        az_json(['ok' => true]);
    }
    if ($action === 'access-list') {
        if ($role !== 'freigabe') {
            az_json(['ok' => false, 'error' => 'Nur die Freigabe verwaltet Zugänge.'], 403);
        }
        az_json([
            'ok' => true,
            'emails' => az_access_emails(),
            'seeds' => az_seed_emails(),
        ]);
    }
    if ($action === 'access-add' || $action === 'access-remove') {
        if ($role !== 'freigabe') {
            az_json(['ok' => false, 'error' => 'Nur die Freigabe verwaltet Zugänge.'], 403);
        }
        $target = az_normalize_email((string) ($body['email'] ?? ''));
        if (!filter_var($target, FILTER_VALIDATE_EMAIL)) {
            az_json(['ok' => false, 'error' => 'Ungültige E-Mail-Adresse.'], 400);
        }
        $extra = az_read_json(AZ_ACCESS_FILE)['emails'] ?? [];
        if (!is_array($extra)) {
            $extra = [];
        }
        if ($action === 'access-add') {
            $extra[] = $target;
        } else {
            if (az_is_seed($target)) {
                az_json(['ok' => false, 'error' => 'Diese Adresse ist fest hinterlegt und kann nicht entzogen werden.'], 400);
            }
            $extra = array_values(array_filter(
                $extra,
                static fn ($item): bool => az_normalize_email((string) $item) !== $target,
            ));
        }
        az_write_access_emails($extra);
        az_json(['ok' => true, 'emails' => az_access_emails(), 'seeds' => az_seed_emails()]);
    }
} catch (Throwable $e) {
    az_json(['ok' => false, 'error' => $e->getMessage()], 400);
}

az_json(['ok' => false, 'error' => 'Unbekannte Aktion.'], 400);
