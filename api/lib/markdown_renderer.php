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
        $quoteParagraph = [];
        $listItems = [];
        $tableRows = [];
        $inCodeBlock = false;
        $codeLanguage = '';
        $codeLines = [];

        $flushParagraph = function () use (&$paragraph, &$html): void {
            if ($paragraph === []) {
                return;
            }
            $html[] = '<p>' . $this->renderFlowLines($paragraph) . '</p>';
            $paragraph = [];
        };

        $flushList = function () use (&$listItems, &$html): void {
            if ($listItems === []) {
                return;
            }
            $html[] = $this->renderList($listItems);
            $listItems = [];
        };

        $flushQuote = function () use (&$quoteParagraph, &$html): void {
            if ($quoteParagraph === []) {
                return;
            }
            $html[] = '<blockquote><p>' . $this->renderFlowLines($quoteParagraph) . '</p></blockquote>';
            $quoteParagraph = [];
        };

        $flushTable = function () use (&$tableRows, &$html): void {
            if ($tableRows === []) {
                return;
            }
            $header = array_shift($tableRows);
            $html[] = '<div class="table-scroll"><table><thead><tr>' . implode('', array_map(
                fn (string $cell): string => '<th>' . $this->renderInline(trim($cell)) . '</th>',
                $header
            )) . '</tr></thead><tbody>';
            foreach ($tableRows as $row) {
                $html[] = '<tr>' . implode('', array_map(
                    fn (string $cell): string => '<td>' . $this->renderInline(trim($cell)) . '</td>',
                    $row
                )) . '</tr>';
            }
            $html[] = '</tbody></table></div>';
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
                $flushQuote();
                $flushList();
                $flushTable();
                $inCodeBlock = true;
                $codeLanguage = isset($matches[1]) ? strtolower($matches[1]) : '';
                $codeLines = [];
                continue;
            }

            if (trim($line) === '') {
                $flushParagraph();
                $flushQuote();
                $flushList();
                $flushTable();
                continue;
            }

            if (preg_match('/^\s*---\s*$/', $line)) {
                $flushParagraph();
                $flushQuote();
                $flushList();
                $flushTable();
                $html[] = '<hr>';
                continue;
            }

            if (preg_match('/^(#{1,5})\s+(.+)$/', $line, $matches)) {
                $flushParagraph();
                $flushQuote();
                $flushList();
                $flushTable();
                // Page-level titles are rendered outside Markdown, so body headings are intentionally
                // shifted down by one level:
                //   #   -> h2
                //   ##  -> h3
                //   ### -> h4
                //   #### -> h5
                //   ##### -> h6
                $level = min(strlen($matches[1]) + 1, 6);
                $html[] = '<h' . $level . '>' . $this->renderInline(trim($matches[2])) . '</h' . $level . '>';
                continue;
            }

            if (preg_match('/^(\s*)- (.+)$/', $line, $matches)) {
                $flushParagraph();
                $flushQuote();
                $flushTable();
                $indentWidth = strlen(str_replace("\t", '  ', $matches[1]));
                $listItems[] = [
                    'level' => intdiv($indentWidth, 2),
                    'type' => 'ul',
                    'text' => $matches[2],
                ];
                continue;
            }

            if (preg_match('/^(\s*)\d+\.\s+(.+)$/', $line, $matches)) {
                $flushParagraph();
                $flushQuote();
                $flushTable();
                $indentWidth = strlen(str_replace("\t", '  ', $matches[1]));
                $listItems[] = [
                    'level' => intdiv($indentWidth, 2),
                    'type' => 'ol',
                    'text' => $matches[2],
                ];
                continue;
            }

            if (preg_match('/^>\s?(.*)$/', $line, $matches)) {
                $flushParagraph();
                $flushList();
                $flushTable();
                $quoteParagraph[] = $matches[1];
                continue;
            }

            if (str_starts_with(trim($line), '|') && str_ends_with(trim($line), '|')) {
                $flushParagraph();
                $flushQuote();
                $flushList();
                $cells = $this->splitMarkdownTableRow($line);
                if ($cells !== [] && !$this->isMarkdownTableSeparator($cells)) {
                    $tableRows[] = $cells;
                }
                continue;
            }

            $flushList();
            $flushQuote();
            $flushTable();
            $paragraph[] = $line;
        }

        $flushParagraph();
        $flushQuote();
        $flushList();
        $flushTable();
        $flushCode();

        return implode("\n", $html);
    }

    private function renderInline(string $text): string
    {
        $escaped = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        $codePlaceholders = [];

        $escaped = preg_replace_callback(
            '/(`+)(.+?)\1/',
            function (array $matches) use (&$codePlaceholders): string {
                $placeholder = '@@CCCCODE' . count($codePlaceholders) . '@@';
                $codeText = $matches[2];

                // When using multiple backticks to show code that itself contains
                // backticks, Markdown commonly allows a single padding space on
                // both sides: `` `code` `` -> <code>`code`</code>.
                if (strlen($codeText) >= 2 && $codeText[0] === ' ' && substr($codeText, -1) === ' ' && trim($codeText) !== '') {
                    $codeText = substr($codeText, 1, -1);
                }

                $codePlaceholders[$placeholder] = '<code>' . $codeText . '</code>';
                return $placeholder;
            },
            $escaped
        ) ?? $escaped;

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
        $escaped = preg_replace('/~~(.+?)~~/s', '<del>$1</del>', $escaped) ?? $escaped;
        $escaped = preg_replace('/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s', '<em>$1</em>', $escaped) ?? $escaped;
        $escaped = preg_replace('/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/s', '<em>$1</em>', $escaped) ?? $escaped;

        if ($codePlaceholders !== []) {
            $escaped = strtr($escaped, $codePlaceholders);
        }

        return $escaped;
    }

    /**
     * @param list<string> $lines
     */
    private function renderFlowLines(array $lines): string
    {
        $html = '';
        $lastIndex = count($lines) - 1;

        foreach ($lines as $index => $line) {
            $html .= $this->renderInline(trim($line));

            if ($index >= $lastIndex) {
                continue;
            }

            $html .= preg_match('/ {2,}$/', $line) === 1 ? '<br>' : ' ';
        }

        return $html;
    }

    private function renderList(array $items): string
    {
        $index = 0;
        $html = '';

        while ($index < count($items)) {
            $level = (int) ($items[$index]['level'] ?? 0);
            $type = (string) ($items[$index]['type'] ?? 'ul');
            $html .= $this->renderListLevel($items, $index, $level, $type);
        }

        return $html;
    }

    private function renderListLevel(array $items, int &$index, int $level, string $type): string
    {
        $tag = $type === 'ol' ? 'ol' : 'ul';
        $html = '<' . $tag . '>';

        while ($index < count($items)) {
            $itemLevel = (int) ($items[$index]['level'] ?? 0);
            $itemType = (string) ($items[$index]['type'] ?? 'ul');
            if ($itemLevel < $level) {
                break;
            }

            if ($itemLevel > $level) {
                $itemLevel = $level;
            }

             if ($itemType !== $type) {
                break;
            }

            $text = (string) ($items[$index]['text'] ?? '');
            $index++;

            $childHtml = '';
            if ($index < count($items)) {
                $nextLevel = (int) ($items[$index]['level'] ?? 0);
                $nextType = (string) ($items[$index]['type'] ?? 'ul');
                if ($nextLevel > $itemLevel) {
                    $childHtml = $this->renderListLevel($items, $index, $nextLevel, $nextType);
                }
            }

            $html .= '<li>' . $this->renderInline($text) . $childHtml . '</li>';
        }

        $html .= '</' . $tag . '>';
        return $html;
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

    /**
     * @return list<string>
     */
    private function splitMarkdownTableRow(string $line): array
    {
        $trimmed = trim($line);
        if (!str_starts_with($trimmed, '|') || !str_ends_with($trimmed, '|')) {
            return [];
        }

        $content = substr($trimmed, 1, -1);
        $cells = [];
        $buffer = '';
        $inCode = false;
        $length = strlen($content);

        for ($index = 0; $index < $length; $index++) {
            $char = $content[$index];

            if ($char === '`') {
                $inCode = !$inCode;
                $buffer .= $char;
                continue;
            }

            if ($char === '|' && !$inCode) {
                $cells[] = trim($buffer);
                $buffer = '';
                continue;
            }

            $buffer .= $char;
        }

        $cells[] = trim($buffer);

        return array_values(array_filter($cells, static fn(string $cell): bool => $cell !== ''));
    }
}
