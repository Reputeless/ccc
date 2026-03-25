## 考え方

`1` から `N` までを順番に出力したいので、`for` 文を使うと自然です。  
変数 `i` を `1` から始めて、`N` まで 1 ずつ増やしながら `printf` します。

## つまずきやすい点

- `for` 文の開始値を `1` にする
- 条件を `i <= N` にして、`N` 自身も出力する
- 1 行ずつ出力するため、`printf("%d\n", i);` のように改行を入れる

## 例

```c
#include <stdio.h>

int main(void) {
	int n;
	scanf("%d", &n);

	for (int i = 1; i <= n; i++) {
		printf("%d\n", i);
	}

	return 0;
}
```
