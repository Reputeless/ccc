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

        $flushTable = function () use (&$tableRows, &$html, &$paragraph, $flushParagraph): void {
            if ($tableRows === []) {
                return;
            }

            if (count($tableRows) < 2 || !$this->isMarkdownTableSeparator($tableRows[1]['cells'])) {
                foreach ($tableRows as $row) {
                    $paragraph[] = $row['raw'];
                }
                $tableRows = [];
                $flushParagraph();
                return;
            }

            $header = $tableRows[0]['cells'];
            $html[] = '<div class="table-scroll"><table><thead><tr>' . implode('', array_map(
                fn (string $cell): string => '<th>' . $this->renderInline(trim($cell)) . '</th>',
                $header
            )) . '</tr></thead><tbody>';
            foreach (array_slice($tableRows, 2) as $row) {
                $html[] = '<tr>' . implode('', array_map(
                    fn (string $cell): string => '<td>' . $this->renderInline(trim($cell)) . '</td>',
                    $row['cells']
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
                if ($cells !== []) {
                    $tableRows[] = [
                        'raw' => $line,
                        'cells' => $cells,
                    ];
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
        $codePlaceholders = [];
        $inlinePlaceholders = [];

        $text = preg_replace_callback(
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

                $codePlaceholders[$placeholder] = '<code>' . htmlspecialchars($codeText, ENT_QUOTES, 'UTF-8') . '</code>';
                return $placeholder;
            },
            $text
        ) ?? $text;

        $text = $this->replaceInlineLinksAndImages($text, $inlinePlaceholders, $codePlaceholders);
        $escaped = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        $escaped = $this->renderEmphasis($escaped);

        if ($inlinePlaceholders !== []) {
            $escaped = strtr($escaped, $inlinePlaceholders);
        }
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
        $url = trim(str_replace(["\r", "\n", "\t"], '', $url));
        if ($url === '') {
            return '#';
        }

        if (preg_match('/^[A-Za-z][A-Za-z0-9+.-]*:/', $url, $matches) === 1) {
            $scheme = strtolower(rtrim($matches[0], ':'));
            return in_array($scheme, ['http', 'https', 'mailto'], true) ? $url : '#';
        }

        if (str_starts_with($url, '//')) {
            return 'https:' . $url;
        }

        if (str_starts_with($url, '#')) {
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
        if ($cells === []) {
            return false;
        }

        foreach ($cells as $cell) {
            if (!preg_match('/^:?-{3,}:?$/', trim($cell))) {
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
        $codeRunLength = 0;
        $length = strlen($content);

        for ($index = 0; $index < $length; $index++) {
            $char = $content[$index];

            if ($char === '\\' && ($content[$index + 1] ?? '') === '|') {
                $buffer .= '|';
                $index++;
                continue;
            }

            if ($char === '`') {
                $runLength = 1;
                while (($content[$index + $runLength] ?? '') === '`') {
                    $runLength++;
                }

                if ($codeRunLength === 0) {
                    $codeRunLength = $runLength;
                } elseif ($runLength === $codeRunLength) {
                    $codeRunLength = 0;
                }

                $buffer .= str_repeat('`', $runLength);
                $index += $runLength - 1;
                continue;
            }

            if ($char === '|' && $codeRunLength === 0) {
                $cells[] = trim($buffer);
                $buffer = '';
                continue;
            }

            $buffer .= $char;
        }

        $cells[] = trim($buffer);

        return $cells;
    }

    private function renderEmphasis(string $text): string
    {
        $text = preg_replace('/\*\*(.+?)\*\*/s', '<strong>$1</strong>', $text) ?? $text;
        $text = preg_replace('/~~(.+?)~~/s', '<del>$1</del>', $text) ?? $text;
        $text = preg_replace('/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/s', '<em>$1</em>', $text) ?? $text;
        return preg_replace('/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/s', '<em>$1</em>', $text) ?? $text;
    }

    private function replaceInlineLinksAndImages(string $text, array &$inlinePlaceholders, array $codePlaceholders): string
    {
        $result = '';
        $offset = 0;
        $length = strlen($text);

        while ($offset < $length) {
            $image = $text[$offset] === '!' && ($text[$offset + 1] ?? '') === '[';
            $link = $text[$offset] === '[';
            if (!$image && !$link) {
                $result .= $text[$offset];
                $offset++;
                continue;
            }

            $labelStart = $offset + ($image ? 2 : 1);
            $labelEnd = $this->findClosingBracket($text, $labelStart);
            if ($labelEnd === null || ($text[$labelEnd + 1] ?? '') !== '(') {
                $result .= $text[$offset];
                $offset++;
                continue;
            }

            $destinationStart = $labelEnd + 2;
            $destinationEnd = $this->findClosingParenthesis($text, $destinationStart);
            if ($destinationEnd === null) {
                $result .= $text[$offset];
                $offset++;
                continue;
            }

            $label = substr($text, $labelStart, $labelEnd - $labelStart);
            $destination = $this->parseLinkDestination(substr($text, $destinationStart, $destinationEnd - $destinationStart));
            if ($destination === '') {
                $result .= $text[$offset];
                $offset++;
                continue;
            }

            $placeholder = '@@CCCLINK' . count($inlinePlaceholders) . '@@';
            $url = htmlspecialchars($this->resolveUrl($destination), ENT_QUOTES, 'UTF-8');

            if ($image) {
                $alt = htmlspecialchars($this->plainTextWithCodePlaceholders($label, $codePlaceholders), ENT_QUOTES, 'UTF-8');
                $inlinePlaceholders[$placeholder] = '<img src="' . $url . '" alt="' . $alt . '">';
            } else {
                $labelHtml = $this->renderInlineText($label, $codePlaceholders);
                $inlinePlaceholders[$placeholder] = '<a href="' . $url . '" target="_blank" rel="noopener noreferrer">' . $labelHtml . '</a>';
            }

            $result .= $placeholder;
            $offset = $destinationEnd + 1;
        }

        return $result;
    }

    private function renderInlineText(string $text, array $codePlaceholders): string
    {
        $html = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
        $html = $this->renderEmphasis($html);
        return $codePlaceholders !== [] ? strtr($html, $codePlaceholders) : $html;
    }

    private function plainTextWithCodePlaceholders(string $text, array $codePlaceholders): string
    {
        foreach ($codePlaceholders as $placeholder => $html) {
            $text = str_replace($placeholder, trim(strip_tags($html)), $text);
        }
        return $text;
    }

    private function findClosingBracket(string $text, int $offset): ?int
    {
        $length = strlen($text);
        for ($index = $offset; $index < $length; $index++) {
            if ($text[$index] === '\\') {
                $index++;
                continue;
            }
            if ($text[$index] === ']') {
                return $index;
            }
        }
        return null;
    }

    private function findClosingParenthesis(string $text, int $offset): ?int
    {
        $depth = 0;
        $length = strlen($text);
        for ($index = $offset; $index < $length; $index++) {
            if ($text[$index] === '\\') {
                $index++;
                continue;
            }
            if ($text[$index] === '(') {
                $depth++;
                continue;
            }
            if ($text[$index] !== ')') {
                continue;
            }
            if ($depth === 0) {
                return $index;
            }
            $depth--;
        }
        return null;
    }

    private function parseLinkDestination(string $content): string
    {
        $trimmed = trim($content);
        if ($trimmed === '') {
            return '';
        }

        if ($trimmed[0] === '<') {
            $end = strpos($trimmed, '>');
            return $end === false ? '' : substr($trimmed, 1, $end - 1);
        }

        if (preg_match('/^(\S+)/', $trimmed, $matches) !== 1) {
            return '';
        }
        return $matches[1];
    }
}
