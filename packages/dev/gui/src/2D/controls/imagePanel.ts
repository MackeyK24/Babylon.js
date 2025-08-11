import type { Nullable } from "core/types";
import { Observable } from "core/Misc/observable";
import { Tools } from "core/Misc/tools";
import { Container } from "./container";
import type { Measure } from "../measure";
import { RegisterClass } from "core/Misc/typeStore";
import { serialize } from "core/Misc/decorators";
import type { ICanvas, ICanvasRenderingContext, IImage } from "core/Engines/ICanvas";
import { EngineStore } from "core/Engines/engineStore";

export class ImagePanel extends Container {
    protected _imageWidth = 0;
    protected _imageHeight = 0;

    protected _loaded = false;

    protected _stretch = ImagePanel.STRETCH_FILL;

    protected _domImage: IImage;

    protected _source: string;

    protected _sourceLeft = 0;
    protected _sourceTop = 0;
    protected _sourceWidth = 0;
    protected _sourceHeight = 0;

    protected _sliceLeft = 0;
    protected _sliceRight = 0;
    protected _sliceTop = 0;
    protected _sliceBottom = 0;

    protected _detectPointerOnOpaqueOnly = false;

    protected _autoScale = false;

    protected _svgAttributesComputationCompleted = false;

    protected _workingCanvas: ICanvas | null = null;

    public onImageLoadedObservable = new Observable<ImagePanel>();
    public onSVGAttributesComputedObservable = new Observable<ImagePanel>();

    @serialize()
    public get detectPointerOnOpaqueOnly(): boolean {
        return this._detectPointerOnOpaqueOnly;
    }
    public set detectPointerOnOpaqueOnly(value: boolean) {
        if (this._detectPointerOnOpaqueOnly === value) {
            return;
        }
        this._detectPointerOnOpaqueOnly = value;
        this._markAsDirty();
    }

    @serialize()
    public get sliceLeft(): number {
        return this._sliceLeft;
    }
    public set sliceLeft(value: number) {
        if (this._sliceLeft === value) {
            return;
        }
        this._sliceLeft = value;
        this._markAsDirty();
    }

    @serialize()
    public get sliceRight(): number {
        return this._sliceRight;
    }
    public set sliceRight(value: number) {
        if (this._sliceRight === value) {
            return;
        }
        this._sliceRight = value;
        this._markAsDirty();
    }

    @serialize()
    public get sliceTop(): number {
        return this._sliceTop;
    }
    public set sliceTop(value: number) {
        if (this._sliceTop === value) {
            return;
        }
        this._sliceTop = value;
        this._markAsDirty();
    }

    @serialize()
    public get sliceBottom(): number {
        return this._sliceBottom;
    }
    public set sliceBottom(value: number) {
        if (this._sliceBottom === value) {
            return;
        }
        this._sliceBottom = value;
        this._markAsDirty();
    }

    @serialize()
    public get sourceLeft(): number {
        return this._sourceLeft;
    }
    public set sourceLeft(value: number) {
        if (this._sourceLeft === value) {
            return;
        }
        this._sourceLeft = value;
        this._markAsDirty();
    }

    @serialize()
    public get sourceTop(): number {
        return this._sourceTop;
    }
    public set sourceTop(value: number) {
        if (this._sourceTop === value) {
            return;
        }
        this._sourceTop = value;
        this._markAsDirty();
    }

    @serialize()
    public get sourceWidth(): number {
        return this._sourceWidth;
    }
    public set sourceWidth(value: number) {
        if (this._sourceWidth === value) {
            return;
        }
        this._sourceWidth = value;
        this._markAsDirty();
    }

    @serialize()
    public get sourceHeight(): number {
        return this._sourceHeight;
    }
    public set sourceHeight(value: number) {
        if (this._sourceHeight === value) {
            return;
        }
        this._sourceHeight = value;
        this._markAsDirty();
    }

    public get imageWidth(): number {
        return this._imageWidth;
    }

    public get imageHeight(): number {
        return this._imageHeight;
    }

    public get isSVG(): boolean {
        return this._svgAttributesComputationCompleted;
    }

    public get svgAttributesComputationCompleted(): boolean {
        return this._svgAttributesComputationCompleted;
    }

    @serialize()
    public get autoScale(): boolean {
        return this._autoScale;
    }
    public set autoScale(value: boolean) {
        if (this._autoScale === value) {
            return;
        }
        this._autoScale = value;
        this._markAsDirty();
    }

    @serialize()
    public get stretch(): number {
        return this._stretch;
    }
    public set stretch(value: number) {
        if (this._stretch === value) {
            return;
        }
        this._stretch = value;
        this._markAsDirty();
    }

    protected _rotate90(value: boolean) {
        if (!value) {
            return;
        }
        const oldLeft = this._sourceLeft;
        this._sourceLeft = this._sourceTop;
        this._sourceTop = oldLeft;
        const oldWidth = this._sourceWidth || this._imageWidth;
        this._sourceWidth = this._sourceHeight || this._imageHeight;
        this._sourceHeight = oldWidth;
    }

    protected _handleRotationForSVGImage() {
        if (this._domImage && (this._domImage as any)._rotation) {
            this._rotate90(true);
        }
    }

    protected _extractNinePatchSliceDataFromImage() {
        if (!this._domImage || (this._domImage as any).nineslice === undefined) {
            return;
        }
        const nine = (this._domImage as any).nineslice;
        this._sliceLeft = nine.left || 0;
        this._sliceRight = nine.right || 0;
        this._sliceTop = nine.top || 0;
        this._sliceBottom = nine.bottom || 0;
    }

    public get domImage(): IImage {
        return this._domImage;
    }
    public set domImage(value: IImage) {
        if (this._domImage === value) {
            return;
        }
        this._domImage = value;
        this._domImage.onload = () => {
            this._onImageLoaded();
        };
        this._loaded = false;
        this._svgAttributesComputationCompleted = false;
        this._workingCanvas = null;
        if (this._domImage && (this._domImage as any).complete) {
            this._onImageLoaded();
        }
        this._markAsDirty();
    }

    protected _onImageLoaded() {
        this._imageWidth = this._domImage.naturalWidth;
        this._imageHeight = this._domImage.naturalHeight;
        this._loaded = true;
        this._extractNinePatchSliceDataFromImage();
        if (this._autoScale) {
            this.synchronizeSizeWithContent();
        }
        this.onImageLoadedObservable.notifyObservers(this);
        this._markAsDirty();
    }

    @serialize()
    public get source(): string {
        return this._source;
    }
    public set source(value: string) {
        if (this._source === value) {
            return;
        }
        if (this._source) {
            this._removeCacheUsage(this._source);
        }
        this._source = value;
        this._loaded = false;
        this._svgAttributesComputationCompleted = false;
        this._workingCanvas = null;

        if (!this._source) {
            this._domImage = null as any;
            this._markAsDirty();
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            this._domImage = img as any;
            this._onImageLoaded();
        };
        img.src = this._source;
    }

    public static ResetImageCache() {
    }

    protected _removeCacheUsage(url: string) {
    }

    public populateNinePatchSlicesFromImage(): void {
        this._extractNinePatchSliceDataFromImage();
        this._markAsDirty();
    }

    @serialize()
    public get cellWidth(): number {
        return 0;
    }
    public set cellWidth(value: number) {
    }

    @serialize()
    public get cellHeight(): number {
        return 0;
    }
    public set cellHeight(value: number) {
    }

    @serialize()
    public get cellId(): number {
        return -1;
    }
    public set cellId(value: number) {
    }

    constructor(name?: string, url?: string) {
        super(name);
        if (url) {
            this.source = url;
        }
    }

    public override contains(x: number, y: number): boolean {
        if (!super.contains(x, y)) {
            return false;
        }
        if (!this._detectPointerOnOpaqueOnly || !this._workingCanvas) {
            return true;
        }
        const context = this._workingCanvas.getContext("2d");
        if (!context) {
            return true;
        }
        const tx = x - this._currentMeasure.left;
        const ty = y - this._currentMeasure.top;
        const data = context.getImageData(tx, ty, 1, 1).data;
        return data[3] > 0;
    }

    public override _getTypeName(): string {
        return "ImagePanel";
    }

    public override synchronizeSizeWithContent() {
        if (!this._loaded || !this._domImage) {
            return;
        }
        this.width = this._imageWidth + "px";
        this.height = this._imageHeight + "px";
    }

    public override _processMeasures(parentMeasure: Measure, context: ICanvasRenderingContext): void {
        super._processMeasures(parentMeasure, context);
    }

    protected _prepareWorkingCanvasForOpaqueDetection() {
        if (!this._detectPointerOnOpaqueOnly) {
            return;
        }
        const width = this._currentMeasure.width;
        const height = this._currentMeasure.height;

        if (!this._workingCanvas) {
            const engine = this._host?.getScene()?.getEngine() || EngineStore.LastCreatedEngine;
            if (!engine) {
                throw new Error("Invalid engine. Unable to create a canvas.");
            }
            this._workingCanvas = engine.createCanvas(width, height);
        }
        const canvas = this._workingCanvas;

        const context = canvas.getContext("2d");

        context.clearRect(0, 0, width, height);
    }

    protected _drawImage(context: ICanvasRenderingContext, sx: number, sy: number, sw: number, sh: number, tx: number, ty: number, tw: number, th: number) {
        context.drawImage(this._domImage, sx, sy, sw, sh, tx, ty, tw, th);

        if (!this._detectPointerOnOpaqueOnly) {
            return;
        }

        const transform = context.getTransform();

        const canvas = this._workingCanvas!;
        const workingCanvasContext = canvas.getContext("2d");
        workingCanvasContext.save();
        const ttx = tx - this._currentMeasure.left;
        const tty = ty - this._currentMeasure.top;
        workingCanvasContext.setTransform(transform.a, transform.b, transform.c, transform.d, (ttx + tw) / 2, (tty + th) / 2);
        workingCanvasContext.translate(-(ttx + tw) / 2, -(tty + th) / 2);

        workingCanvasContext.drawImage(this._domImage, sx, sy, sw, sh, ttx, tty, tw, th);
        workingCanvasContext.restore();
    }

    protected override _localDraw(context: ICanvasRenderingContext): void {
        context.save();

        if (this.shadowBlur || this.shadowOffsetX || this.shadowOffsetY) {
            context.shadowColor = this.shadowColor;
            context.shadowBlur = this.shadowBlur;
            context.shadowOffsetX = this.shadowOffsetX;
            context.shadowOffsetY = this.shadowOffsetY;
        }

        let x, y, width, height;
        x = this._sourceLeft;
        y = this._sourceTop;
        width = this._sourceWidth ? this._sourceWidth : this._imageWidth;
        height = this._sourceHeight ? this._sourceHeight : this._imageHeight;

        this._prepareWorkingCanvasForOpaqueDetection();

        this._applyStates(context as any);
        if (this._loaded && this._domImage) {
            switch (this._stretch) {
                case ImagePanel.STRETCH_NONE:
                    this._drawImage(context, x, y, width, height, this._currentMeasure.left, this._currentMeasure.top, this._currentMeasure.width, this._currentMeasure.height);
                    break;
                case ImagePanel.STRETCH_FILL:
                    this._drawImage(context, x, y, width, height, this._currentMeasure.left, this._currentMeasure.top, this._currentMeasure.width, this._currentMeasure.height);
                    break;
                case ImagePanel.STRETCH_UNIFORM: {
                    const hRatio = this._currentMeasure.width / width;
                    const vRatio = this._currentMeasure.height / height;
                    const ratio = Math.min(hRatio, vRatio);
                    const centerX = (this._currentMeasure.width - width * ratio) / 2;
                    const centerY = (this._currentMeasure.height - height * ratio) / 2;

                    this._drawImage(context, x, y, width, height, this._currentMeasure.left + centerX, this._currentMeasure.top + centerY, width * ratio, height * ratio);
                    break;
                }
                case ImagePanel.STRETCH_EXTEND:
                    this._drawImage(context, x, y, width, height, this._currentMeasure.left, this._currentMeasure.top, this._currentMeasure.width, this._currentMeasure.height);
                    break;
                case ImagePanel.STRETCH_NINE_PATCH:
                    this._renderNinePatch(context, x, y, width, height);
                    break;
            }
        }

        context.restore();
    }

    protected _renderNinePatch(context: ICanvasRenderingContext, sx: number, sy: number, sw: number, sh: number): void {
        const idealRatio = this.host.idealWidth
            ? this._width.getValue(this.host) / this.host.idealWidth
            : this.host.idealHeight
              ? this._height.getValue(this.host) / this.host.idealHeight
              : 1;
        const leftWidth = this._sliceLeft;
        const topHeight = this._sliceTop;
        const bottomHeight = sh - this._sliceBottom;
        const rightWidth = sw - this._sliceRight;
        const centerWidth = this._sliceRight - this._sliceLeft;
        const centerHeight = this._sliceBottom - this._sliceTop;
        const leftWidthAdjusted = Math.round(leftWidth * idealRatio);
        const topHeightAdjusted = Math.round(topHeight * idealRatio);
        const bottomHeightAdjusted = Math.round(bottomHeight * idealRatio);
        const rightWidthAdjusted = Math.round(rightWidth * idealRatio);
        const targetCenterWidth = Math.round(this._currentMeasure.width) - rightWidthAdjusted - leftWidthAdjusted + 2;
        const targetCenterHeight = Math.round(this._currentMeasure.height) - bottomHeightAdjusted - topHeightAdjusted + 2;
        const centerLeftOffset = Math.round(this._currentMeasure.left) + leftWidthAdjusted - 1;
        const centerTopOffset = Math.round(this._currentMeasure.top) + topHeightAdjusted - 1;
        const rightOffset = Math.round(this._currentMeasure.left + this._currentMeasure.width) - rightWidthAdjusted;
        const bottomOffset = Math.round(this._currentMeasure.top + this._currentMeasure.height) - bottomHeightAdjusted;

        this._drawImage(context, sx, sy, leftWidth, topHeight, this._currentMeasure.left, this._currentMeasure.top, leftWidthAdjusted, topHeightAdjusted);
        this._drawImage(context, sx + this._sliceLeft, sy, centerWidth, topHeight, centerLeftOffset + 1, this._currentMeasure.top, targetCenterWidth - 2, topHeightAdjusted);
        this._drawImage(context, sx + this._sliceRight, sy, rightWidth, topHeight, rightOffset, this._currentMeasure.top, rightWidthAdjusted, topHeightAdjusted);
        this._drawImage(context, sx, sy + this._sliceTop, leftWidth, centerHeight, this._currentMeasure.left, centerTopOffset + 1, leftWidthAdjusted, targetCenterHeight - 2);
        this._drawImage(
            context,
            sx + this._sliceLeft,
            sy + this._sliceTop,
            centerWidth,
            centerHeight,
            centerLeftOffset + 1,
            centerTopOffset + 1,
            targetCenterWidth - 2,
            targetCenterHeight - 2
        );
        this._drawImage(context, sx + this._sliceRight, sy + this._sliceTop, rightWidth, centerHeight, rightOffset, centerTopOffset + 1, rightWidthAdjusted, targetCenterHeight - 2);
        this._drawImage(context, sx, sy + this._sliceBottom, leftWidth, bottomHeight, this._currentMeasure.left, bottomOffset, leftWidthAdjusted, bottomHeightAdjusted);
        this._drawImage(
            context,
            sx + this.sliceLeft,
            sy + this._sliceBottom,
            centerWidth,
            bottomHeight,
            centerLeftOffset + 1,
            bottomOffset,
            targetCenterWidth - 2,
            bottomHeightAdjusted
        );
        this._drawImage(context, sx + this._sliceRight, sy + this._sliceBottom, rightWidth, bottomHeight, rightOffset, bottomOffset, rightWidthAdjusted, bottomHeightAdjusted);
    }

    public override dispose() {
        super.dispose();
        this.onImageLoadedObservable.clear();
        this.onSVGAttributesComputedObservable.clear();
        this._removeCacheUsage(this._source);
    }

    public static readonly STRETCH_NONE = 0;
    public static readonly STRETCH_FILL = 1;
    public static readonly STRETCH_UNIFORM = 2;
    public static readonly STRETCH_EXTEND = 3;
    public static readonly STRETCH_NINE_PATCH = 4;
}
RegisterClass("BABYLON.GUI.ImagePanel", ImagePanel);
