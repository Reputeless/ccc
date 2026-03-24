## 問題

2つの整数 `a`, `b` が与えられます。  
その和を出力してください。

## 制約

- `1 <= a, b <= 100`

## 入力

入力は次の形式で標準入力から与えられます。

```text
a b
```

## 出力

`a + b` の値を 1 行で出力してください。

## ヒント

まず `scanf` で 2 つの整数を読み取り、そのあと `printf` で和を出力します。

```c
#include <stdio.h>

int main(void) {
	int a, b;
	scanf("%d %d", &a, &b);
	printf("%d\n", a + b);
	return 0;
}
```
