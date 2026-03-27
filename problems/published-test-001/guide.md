## 考え方

この問題の目的は、`publishedAt` による公開日時の制御を確認することです。  
判定自体は、文字列 `publishedAt test` を 1 行で出力できれば通ります。

## つまずきやすい点

- `publishedAt` を過去にすると一覧へ出るか
- `publishedAt` を未来にすると一覧から消えるか
- 日付文字列の形式を崩したときに `問題ステータス` がどうなるか

## 模範解答

```c
#include <stdio.h>

int main()
{
	puts("publishedAt test");
}
```
