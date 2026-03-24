<?php
declare(strict_types=1);

define('CCC_ROOT', realpath(__DIR__ . '/..') ?: __DIR__ . '/..');
define('CCC_CONFIG_DIR', CCC_ROOT . DIRECTORY_SEPARATOR . 'config');
define('CCC_PROBLEMS_DIR', CCC_ROOT . DIRECTORY_SEPARATOR . 'problems');

require_once __DIR__ . '/lib/response.php';
require_once __DIR__ . '/lib/config_loader.php';
require_once __DIR__ . '/lib/problem_loader.php';
require_once __DIR__ . '/lib/markdown_renderer.php';
require_once __DIR__ . '/lib/judge_service.php';
