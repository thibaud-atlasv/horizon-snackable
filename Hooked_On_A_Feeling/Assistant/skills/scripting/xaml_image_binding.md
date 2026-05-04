---
name: xaml_image_binding
summary: binding image source in noesis xaml
include: always
agents: [global]
---

Noesis does not support {Binding} markup extensions on Image.Source — always use the explicit element binding syntax instead.

for image binding use the syntax : 

```xml
<Image>
    <Image.Source>
        <Binding Path="spriteTexture"/>
    </Image.Source>
</Image>
```


do NOT use : 

```xml
<Image Source="{Binding spriteTexture}" />
```

Then bind a TextureAsset in view model and it should work