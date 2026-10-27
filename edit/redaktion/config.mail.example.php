<?php
/**
 * Kopieren nach config.mail.php (nicht committen).
 * Ohne host/user/pass wird PHP mail() verwendet.
 */
return [
    'host' => 'smtp.office365.com',
    'port' => 587,
    'user' => 'noreply@andrezuraikat.ch',
    'pass' => '',
    'secure' => 'tls',
    'from' => 'noreply@andrezuraikat.ch',
    'from_name' => 'André Zuraikat',
];
