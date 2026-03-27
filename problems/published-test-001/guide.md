## 考え方

`publishedAt` の公開制御を試すためのテスト用問題です。

## つまずきやすい点

- `publishedAt` を過去にすると一覧へ出るか
- `publishedAt` を未来にすると一覧から消えるか
- 日付文字列の形式を崩したときに `問題ステータス` がどうなるか

## 模範解答

```c
#include <stdio.h>

int main(void) {
    puts("publishedAt test");
    return 0;
}
```
