# UE4 Material Expression Node Generator

## Features

Looks for `float<N> main(...)` function in the active document and generates a material expression node to the clipboard ready to be pasted in your UE4 material. Works great with the HLSL Preview extension.

```C
float GlobalParam = 1;
float4 main(float2 uv : TEXCOORD0) : SV_Target0
{
    return 1;
}
```

this extension assumes that the main function is in global scope, its definition starts right at the beginning of line and the enclosing curly brackets are also both are the first characters on a line as seen above.

You can include other files in your code and this extension will recursively expand them for the expression node. Includes are always relative to their containing file.

```C
// include.hlsl
#if !defined(include_hlsl)
#define include_hlsl 1

#define PI 3.141592653589793238

#endif

// main.hlsl
float GlobalParam = 1;
float4 main(float2 uv : TEXCOORD0) : SV_Target0
{
    #include "include.hlsl"
    return PI;
}
```

will result in 

```C
#if !defined(include_hlsl)
#define include_hlsl 1

#define PI 3.141592653589793238

#endif
return PI
```

## Known Issues

It would be great if the extension would ask for function name instead of being hard coded.

**Enjoy!**
