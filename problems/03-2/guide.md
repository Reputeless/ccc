## 考え方

この問題では、入力された 2 つの整数をそのまま足し算します。  
まず `scanf` で `a` と `b` を読み込み、そのあと `a + b` を `printf` で表示します。

## つまずきやすい点

- `scanf` で 2 つの整数を読むときは、`%d %d` のように書きます
- `scanf` の変数には `&` を付けます
- 出力の最後に `\n` を入れておきましょう

## 模範解答

```c
#include <stdio.h>

int main()
{
	int a, b;
	scanf("%d %d", &a, &b);
	printf("%d\n", (a + b));
}
```

## 別の書き方

式のまわりの `()` は、付けなくても正しく動きます。

```c
#include <stdio.h>

int main()
{
	int a, b;
	scanf("%d %d", &a, &b);
	printf("%d\n", a + b);
}
```
