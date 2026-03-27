## 考え方

この問題では、`Apple` と `Banana` の間に空行を 1 行入れる必要があります。  
つまり、改行を合計 2 回入れればよいことになります。

このような出力は、1 回の `puts` に `\n\n` を入れてまとめて書くこともできますし、複数回の `puts` で分けて書くこともできます。

## つまずきやすい点

- `Apple` と `Banana` をただ 2 行で出力すると、間の空行が足りません
- 空行 1 行は、改行 2 回分で表現します
- `puts` は最後に改行を 1 つ付けることを忘れないようにしましょう

## 模範解答

```c
#include <stdio.h>

int main()
{
	puts("Apple\n\nBanana");
}
```

## 別の書き方

次のような書き方でも正しく出力できます。

### 1. 文字列を分けて、途中に `\n` を入れる

```c
#include <stdio.h>

int main()
{
	puts("Apple\n");
	puts("Banana");
}
```

### 2. 空文字列を 1 行分はさむ

```c
#include <stdio.h>

int main()
{
	puts("Apple");
	puts("");
	puts("Banana");
}
```
