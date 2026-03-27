## 考え方

文字列を左から順に見ていき、`o` が続いている間は連続数を増やします。  
`x` が出たら連続は切れるので、連続数を 0 に戻します。

このとき、

- 今の連続数
- これまでの最大値

の 2 つを持っておくと、1 回の走査で答えを求められます。

## つまずきやすい点

- `o` を見たときは連続数を 1 増やします
- `x` を見たときは連続数を 0 に戻します
- 最大値の更新を忘れないようにします

## 模範解答

```cpp
#include <algorithm>
#include <iostream>
#include <print>
#include <string>

int main()
{
	std::string s;
	std::cin >> s;

	int current = 0;
	int best = 0;

	for (char ch : s)
	{
		if (ch == 'o')
		{
			++current;
			best = std::max(best, current);
		}
		else
		{
			current = 0;
		}
	}

	std::println("{}", best);
}
```
