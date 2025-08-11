# Custom GUI Control example: ImagePanel (external)

This document shows how to implement a custom GUI control that draws an image (including 9-slice) while supporting children, without modifying Babylon.js source. It also shows how to make it work with JSON and XML parsing.

- Register your control with RegisterClass so Babylon’s JSON/XML deserializers can instantiate it.
- Ensure your module is imported before parsing JSON/XML so registration runs.
- Extend Container and implement your drawing in _localDraw so children render above your background.

Example implementation (TypeScript in your own project):
```ts
import { Container } from "@babylonjs/gui/2D";
import type { ICanvasRenderingContext } from "@babylonjs/core/Engines/ICanvas";
import { RegisterClass } from "@babylonjs/core/Misc/typeStore";
import { serialize } from "@babylonjs/core/Misc/decorators";

export class ImagePanel extends Container {
    private _img: HTMLImageElement | null = null;
    private _loaded = false;

    @serialize() public source: string = "";
    @serialize() public stretch: number = 1; // match Image.STRETCH_* if you want
    @serialize() public sliceLeft: number = 0;
    @serialize() public sliceRight: number = 0;
    @serialize() public sliceTop: number = 0;
    @serialize() public sliceBottom: number = 0;

    public override _getTypeName() {
        return "ImagePanel";
    }

    public setSource(url: string) {
        if (this.source === url) return;
        this.source = url;
        this._loaded = false;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            this._img = img;
            this._loaded = true;
            this._markAsDirty();
        };
        img.src = url;
    }

    protected override _localDraw(ctx: ICanvasRenderingContext): void {
        if (!this._loaded || !this._img) return;

        const left = this._currentMeasure.left;
        const top = this._currentMeasure.top;
        const width = this._currentMeasure.width;
        const height = this._currentMeasure.height;

        if (this.stretch === 4 /* NINE_PATCH */) {
            const sx = 0, sy = 0, sw = this._img.naturalWidth, sh = this._img.naturalHeight;
            const leftWidth = this.sliceLeft;
            const topHeight = this.sliceTop;
            const rightWidth = sw - this.sliceRight;
            const bottomHeight = sh - this.sliceBottom;
            const centerWidth = this.sliceRight - this.sliceLeft;
            const centerHeight = this.sliceBottom - this.sliceTop;

            const lw = leftWidth;
            const th = topHeight;
            const rw = sw - rightWidth;
            const bh = sh - bottomHeight;

            const targetCenterW = Math.max(0, width - lw - (sw - rightWidth));
            const targetCenterH = Math.max(0, height - th - (sh - bottomHeight));
            const cx = left + lw;
            const cy = top + th;
            const rx = left + width - (sw - rightWidth);
            const by = top + height - (sh - bottomHeight);

            // top-left
            ctx.drawImage(this._img, sx, sy, leftWidth, topHeight, left, top, lw, th);
            // top
            ctx.drawImage(this._img, sx + this.sliceLeft, sy, centerWidth, topHeight, cx, top, targetCenterW, th);
            // top-right
            ctx.drawImage(this._img, sx + this.sliceRight, sy, sw - this.sliceRight, topHeight, rx, top, sw - this.sliceRight, th);

            // left
            ctx.drawImage(this._img, sx, sy + this.sliceTop, leftWidth, centerHeight, left, cy, lw, targetCenterH);
            // center
            ctx.drawImage(this._img, sx + this.sliceLeft, sy + this.sliceTop, centerWidth, centerHeight, cx, cy, targetCenterW, targetCenterH);
            // right
            ctx.drawImage(this._img, sx + this.sliceRight, sy + this.sliceTop, sw - this.sliceRight, centerHeight, rx, cy, sw - this.sliceRight, targetCenterH);

            // bottom-left
            ctx.drawImage(this._img, sx, sy + this.sliceBottom, leftWidth, sh - this.sliceBottom, left, by, lw, sh - this.sliceBottom);
            // bottom
            ctx.drawImage(this._img, sx + this.sliceLeft, sy + this.sliceBottom, centerWidth, sh - this.sliceBottom, cx, by, targetCenterW, sh - this.sliceBottom);
            // bottom-right
            ctx.drawImage(this._img, sx + this.sliceRight, sy + this.sliceBottom, sw - this.sliceRight, sh - this.sliceBottom, rx, by, sw - this.sliceRight, sh - this.sliceBottom);
        } else {
            ctx.drawImage(this._img, left, top, width, height);
        }
    }

    public override _parseFromContent(serializedObject: any): void {
        super._parseFromContent(serializedObject);
        if (serializedObject.source) {
            this.setSource(serializedObject.source);
        }
    }
}

RegisterClass("BABYLON.GUI.ImagePanel", ImagePanel);
```

Usage with JSON (AdvancedDynamicTexture.parseSerializedObject):
```json
{
  "className": "ImagePanel",
  "name": "panelA",
  "source": "textures/panel.png",
  "stretch": 4,
  "sliceLeft": 16,
  "sliceRight": 48,
  "sliceTop": 16,
  "sliceBottom": 48,
  "children": [
    { "className": "TextBlock", "name": "title", "text": "Hello", "color": "white" }
  ]
}
```

Usage with XML (XmlLoader):
```xml
<ImagePanel id="panelA" source="textures/panel.png" stretch="4" sliceLeft="16" sliceRight="48" sliceTop="16" sliceBottom="48">
  <TextBlock id="title" text="Hello" color="white"/>
</ImagePanel>
```

Notes:
- Ensure your module is imported (side-effect) before parsing JSON/XML so RegisterClass runs.
- Properties decorated with @serialize will be set from JSON/XML. For custom attributes in XML, ensure XmlLoader maps attributes to your properties by name.
