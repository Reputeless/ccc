<?php
declare(strict_types=1);

final class CccMarkdownRenderer
{
    private string $problemId;
    private ?string $basePathPrefix;

    public function __construct(string $problemId, ?string $basePathPrefix = null)
    {
        $this->problemId = $problemId;
        $this->basePathPrefix = $basePathPrefix;
    }

    public function render(string $markdown): string
    {
        $lines = preg_split('/\r\n|\r|\n/', $markdown) ?: [];
        $html = [];
        $paragraph = [];
        $listItems = [];
        $tableRows = [];
        $inCodeBlock = false;
        $codeLanguage = '';
        $codeLines = [];

        $flushParagraph = function () use (&$paragraph, &$html): void {
            if ($paragraph === []) {
                return;
            }
            $text = implode(' ', array_map('trim', $paragraph));
            $html[] = '<p>' . $this->renderInline($text) . '</p>';
            $paragraph = [];
        };

        $flushList = function () use (&$listItems, &$html): void {
            if ($listItems === []) {
                return;
            }
            $html[] = '<ul>' . implode('', array_map(
                fn (string $item): string => '<li>' . $this->renderInline($item) . '</li>',
                $listItems
            )) . '</ul>';
            $listItems = [];
        };

        $flushTable = function () use (&$tableRows, &$html): void {
            if ($tableRows === []) {
                return;
            }
            $header = array_shift($tableRows);
            $html[] = '<table><thead><tr>' . implode('', array_map(
                fn (string $cell): string => '<th>' . $this->renderInline(trim($cell)) . '</th>',
                $header
            )) . '</tr></thead><tbody>';
            foreach ($tableRows as $row) {
                $html[] = '<tr>' . implode('', array_map(
                    fn (string $cell): string => '<td>' . $this->renderInline(trim($cell)) . '</td>',
                    $row
                )) . '</tr>';
            }
            $html[] = '</tbody></table>';
            $tableRows = [];
        };

        $flushCode = function () use (&$inCodeBlock, &$codeLanguage, &$codeLines, &$html): void {
            if (!$inCodeBlock) {
                return;
            }
            $class = $codeLanguage !== '' ? ' class="language-' . htmlspecialchars($codeLanguage, ENT_QUOTES, 'UTF-8') . '"' : '';
            $code = htmlspecialchars(implode("\n", $codeLines), ENT_QUOTES, 'UTF-8');
            $html[] = '<pre><code' . $class . '>' . $code . '</code></pre>';
            $inCodeBlock = false;
            $codeLanguage = '';
            $codeLines = [];
        };

        foreach ($lines as $line) {
            if ($inCodeBlock) {
                if (preg_match('/^```/', $line)) {
                    $flushCode();
                } else {
                    $codeLines[] = $line;
                }
                continue;
            }

            if (preg_match('/^```([A-Za-z0-9_-]+)?\s*$/', $line, $matches)) {
                $flushParagraph();
                $flushList();
                $flushTable();
                $inCodeBlock = true;
                $codeLanguage = isset($matches[1]) ? strtolower($matches[1]) : '';
                $codeLines = [];
                continue;
            }

            if (trim($line) === '') {
                $flushParagraph();
                $flushList();
                $flushTable();
                continue;
            }

            if (preg_match('/^(#{1,3})\s+(.+)$/', $line, $matches)) {
                $flushParagraph();
                $flushList();
                $flushTable();
                // The page title is already rendered outside body.md, so body headings are displayed one level lower.
                $level = min(strlen($matches[1]) + 1, 6);
                $html[] = '<h' . $level . '>' . $this->renderInline(trim($matches[2])) . '</h' . $level . '>';
                continue;
            }

            if (preg_match('/^- (.+)$/', $line, $matches)) {
                $flushParagraph();
                $flushTable();
                $listItems[] = $matches[1];
                continue;
            }

            if (str_starts_with(trim($line), '|') && str_ends_with(trim($line), '|')) {
                $flushParagraph();
                $flushList();
                $cells = array_values(array_filter(array_map('trim', explode('|', trim($line, '|'))), static fn ($cell) => $cell !== ''));
                if ($cells !== [] && !$this->isMarkdownTableSeparator($cells)) {
                    $tableRows[] = $cells;
                }
                continue;
            }

            $flushList();
            $flushTable();
            $paragraph[] = $line;
        }

        $flushParagraph();
        $flushList();
        $flushTable();
        $flushCode();

        return implode("\n", $html);
    }

    private function renderInline(string $text): string
    {
        $escaped = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');

        $escaped = preg_replace_callback(
            '/!\[([^\]]*)\]\(([^)]+)\)/',
            fn (array $matches): string => '<img src="' . htmlspecialchars($this->resolveUrl($matches[2]), ENT_QUOTES, 'UTF-8') . '" alt="' . htmlspecialchars($matches[1], ENT_QUOTES, 'UTF-8') . '">',
            $escaped
        ) ?? $escaped;

        $escaped = preg_replace_callback(
            '/\[([^\]]+)\]\(([^)]+)\)/',
            fn (array $matches): string => '<a href="' . htmlspecialchars($this->resolveUrl($matches[2]), ENT_QUOTES, 'UTF-8') . '" target="_blank" rel="noopener noreferrer">' . $matches[1] . '</a>',
            $escaped
        ) ?? $escaped;

        $escaped = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $escaped) ?? $escaped;
        $escaped = preg_replace('/`([^`]+)`/', '<code>$1</code>', $escaped) ?? $escaped;

        return $escaped;
    }

    private function resolveUrl(string $url): string
    {
        if (preg_match('/^https?:\/\//i', $url)) {
            return $url;
        }

        $trimmed = ltrim($url, './');
        if ($this->basePathPrefix !== null) {
            return $this->basePathPrefix . $trimmed;
        }
        return 'problems/' . rawurlencode($this->problemId) . '/' . $trimmed;
    }

    private function isMarkdownTableSeparator(array $cells): bool
    {
        foreach ($cells as $cell) {
            if (!preg_match('/^:?-{3,}:?$/', $cell)) {
                return false;
            }
        }
        return true;
    }
}
