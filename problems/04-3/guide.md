## 考え方

この問題では、2 つの整数を比べて、大きい方だけを出力します。  
`if` 文を使うと、条件によって出力を分けられます。

たとえば、`a > b` なら `a` を出力し、そうでなければ `b` を出力します。  
`a` と `b` が等しいときも、`b` を出力すれば正しい答えになります。

## つまずきやすい点

- `scanf` の変数には `&` を付けます
- 大きい方を比べるので、条件は `a > b` のように書きます
- `if` のあとと `else` のあとに、それぞれ 1 回ずつ `printf` を書きます

## 模範解答

```c
#include <stdio.h>

int main()
{
	int a, b;
	scanf("%d %d", &a, &b);

	if (a > b)
	{
		printf("%d\n", a);
	}
	else
	{
		printf("%d\n", b);
	}
}
```

## 別の書き方

`a < b` かどうかで分けても解けます。

```c
#include <stdio.h>

int main()
{
	int a, b;
	scanf("%d %d", &a, &b);

	if (a < b)
	{
		printf("%d\n", b);
	}
	else
	{
		printf("%d\n", a);
	}
}
```
