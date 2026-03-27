## 考え方

この問題では、文字列 `Hello, C++!` をそのまま 1 行で出力します。  
C++23 では、`std::println` を使うと改行付きの出力を簡潔に書けます。

## 模範解答

```cpp
#include <print>

int main()
{
	std::println("Hello, C++!");
}
```

## 別の書き方

`std::cout` を使っても同じ出力ができます。

```cpp
#include <iostream>

int main()
{
	std::cout << "Hello, C++!\n";
}
```
