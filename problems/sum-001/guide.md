## 考え方

この問題では、入力された 2 つの整数をそのまま足し算すればよいです。  
まず `scanf` で `a` と `b` を読み取り、その後 `a + b` を `printf` で出力します。

## つまずきやすい点

- `scanf` の変数には `&` を付ける
- 出力の最後に `\n` を入れておく

## 例

```c
#include <stdio.h>

int main(void) {
	int a, b;
	scanf("%d %d", &a, &b);
	printf("%d\n", a + b);
	return 0;
}
```
