## 考え方

長方形の面積は、縦と横を掛け算すると求められます。  
この問題では `h * w` をそのまま計算して出力すれば十分です。

## 手順

1. `scanf` で縦 `h` と横 `w` を読む
2. `h * w` を計算する
3. `printf` で 1 行に出力する

## 例

```c
#include <stdio.h>

int main(void) {
	int h, w;
	scanf("%d %d", &h, &w);
	printf("%d\n", h * w);
	return 0;
}
```
