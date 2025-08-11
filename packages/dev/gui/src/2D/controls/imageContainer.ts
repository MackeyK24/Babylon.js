import type { Nullable } from "core/types";
import { Observable } from "core/Misc/observable";
import { Tools } from "core/Misc/tools";

import { Container } from "./container";
import type { Measure } from "../measure";
import { RegisterClass } from "core/Misc/typeStore";
import { serialize } from "core/Misc/decorators";
import type { ICanvas, ICanvasRenderingContext, IImage } from "core/Engines/ICanvas";
import { EngineStore } from "core/Engines/engineStore";

export class ImageContainer extends Container {
    public alt?: string;

    private _workingCanvas: Nullable<ICanvas> = null;

    private _domImage: IImage;
    private _imageWidth: number;
    private _imageHeight: number;
    private _loaded = false;
    private _stretch = ImageContainer.STRETCH_FILL;
    private _source: Nullable<string> = null;
    private _autoScale = false;

    private _sourceLeft = 0;
    private _sourceTop = 0;
    private _sourceWidth = 0;
    private _sourceHeight = 0;
    private _svgAttributesComputationCompleted: boolean = false;
    private _isSVG: boolean = false;

    private _cellWidth: number = 0;
    private _cellHeight: number = 0;
    private _cellId: number = -1;

    private _sliceLeft: number;
    private _sliceRight: number;
    private _sliceTop: number;
    private _sliceBottom: number;

    private _populateNinePatchSlicesFromImage = false;

    private _detectPointerOnOpaqueOnly: boolean;

    private _imageDataCache: {
        data: Uint8ClampedArray | null;
        key: string;
    } = { data: null, key: "" };

    public static SourceImgCache = new Map<string, { img: IImage; timesUsed: number; loaded: boolean; waitingForLoadCallback: Array<() => void> }>();

    public onImageLoadedObservable = new Observable<ImageContainer>();

    public onSVGAttributesComputedObservable = new Observable<ImageContainer>();

    public referrerPolicy: Nullable<ReferrerPolicy>;

    public get isLoaded(): boolean {
        return this._loaded;
    }

    public override isReady(): boolean {
        return this.isLoaded;
    }

    @serialize()
    public get detectPointerOnOpaqueOnly(): boolean {
        return this._detectPointerOnOpaqueOnly;
    }

    public set detectPointerOnOpaqueOnly(value: boolean) {
        if (this._detectPointerOnOpaqueOnly === value) {
            return;
        }

        this._detectPointerOnOpaqueOnly = value;
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

    @serialize()
    public get populateNinePatchSlicesFromImage(): boolean {
        return this._populateNinePatchSlicesFromImage;
    }

    public set populateNinePatchSlicesFromImage(value: boolean) {
        if (this._populateNinePatchSlicesFromImage === value) {
            return;
        }

        this._populateNinePatchSlicesFromImage = value;

        if (this._populateNinePatchSlicesFromImage && this._loaded) {
            this._extractNinePatchSliceDataFromImage();
        }
    }

    public get isSVG(): boolean {
        return this._isSVG;
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

        if (value && this._loaded) {
            this.synchronizeSizeWithContent();
        }
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

    public _rotate90(n: number, preserveProperties: boolean = false): ImageContainer {
        const width = this._domImage.width;
        const height = this._domImage.height;

        const engine = this._host?.getScene()?.getEngine() || EngineStore.LastCreatedEngine;
        if (!engine) {
            throw new Error("Invalid engine. Unable to create a canvas.");
        }
        const canvas = engine.createCanvas(height, width);

        const context = canvas.getContext("2d");

        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate((n * Math.PI) / 2);

        context.drawImage(this._domImage, 0, 0, width, height, -width / 2, -height / 2, width, height);

        const dataUrl: string = canvas.toDataURL("image/jpg");
        const rotatedImage = new ImageContainer(this.name + "rotated");
        rotatedImage.source = dataUrl;

        if (preserveProperties) {
            rotatedImage._stretch = this._stretch;
            rotatedImage._autoScale = this._autoScale;
            rotatedImage._cellId = this._cellId;
            rotatedImage._cellWidth = n % 1 ? this._cellHeight : this._cellWidth;
            rotatedImage._cellHeight = n % 1 ? this._cellWidth : this._cellHeight;
        }

        this._handleRotationForSVGImage(this, rotatedImage, n);

        this._imageDataCache.data = null;

        return rotatedImage;
    }

    private _handleRotationForSVGImage(srcImage: ImageContainer, dstImage: ImageContainer, n: number): void {
        if (!srcImage._isSVG) {
            return;
        }

        if (srcImage._svgAttributesComputationCompleted) {
            this._rotate90SourceProperties(srcImage, dstImage, n);
            this._markAsDirty();
        } else {
            srcImage.onSVGAttributesComputedObservable.addOnce(() => {
                this._rotate90SourceProperties(srcImage, dstImage, n);
                this._markAsDirty();
            });
        }
    }

    private _rotate90SourceProperties(srcImage: ImageContainer, dstImage: ImageContainer, n: number): void {
        let srcLeft = srcImage.sourceLeft,
            srcTop = srcImage.sourceTop,
            srcWidth = srcImage.domImage.width,
            srcHeight = srcImage.domImage.height;

        let dstLeft = srcLeft,
            dstTop = srcTop,
            dstWidth = srcImage.sourceWidth,
            dstHeight = srcImage.sourceHeight;

        if (n != 0) {
            const mult = n < 0 ? -1 : 1;
            n = n % 4;
            for (let i = 0; i < Math.abs(n); ++i) {
                dstLeft = -(srcTop - srcHeight / 2) * mult + srcHeight / 2;
                dstTop = (srcLeft - srcWidth / 2) * mult + srcWidth / 2;
                [dstWidth, dstHeight] = [dstHeight, dstWidth];
                if (n < 0) {
                    dstTop -= dstHeight;
                } else {
                    dstLeft -= dstWidth;
                }
                srcLeft = dstLeft;
                srcTop = dstTop;
                [srcWidth, srcHeight] = [srcHeight, srcWidth];
            }
        }

        dstImage.sourceLeft = dstLeft;
        dstImage.sourceTop = dstTop;
        dstImage.sourceWidth = dstWidth;
        dstImage.sourceHeight = dstHeight;
    }

    private _extractNinePatchSliceDataFromImage() {
        const width = this._domImage.width;
        const height = this._domImage.height;

        if (!this._workingCanvas) {
            const engine = this._host?.getScene()?.getEngine() || EngineStore.LastCreatedEngine;
            if (!engine) {
                throw new Error("Invalid engine. Unable to create a canvas.");
            }
            this._workingCanvas = engine.createCanvas(width, height);
        }
        const canvas = this._workingCanvas;
        const context = canvas.getContext("2d");

        context.drawImage(this._domImage, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);

        this._sliceLeft = -1;
        this._sliceRight = -1;
        for (let x = 0; x < width; x++) {
            const alpha = imageData.data[x * 4 + 3];

            if (alpha > 127 && this._sliceLeft === -1) {
                this._sliceLeft = x;
                continue;
            }

            if (alpha < 127 && this._sliceLeft > -1) {
                this._sliceRight = x;
                break;
            }
        }

        this._sliceTop = -1;
        this._sliceBottom = -1;
        for (let y = 0; y < height; y++) {
            const alpha = imageData.data[y * width * 4 + 3];

            if (alpha > 127 && this._sliceTop === -1) {
                this._sliceTop = y;
                continue;
            }

            if (alpha < 127 && this._sliceTop > -1) {
                this._sliceBottom = y;
                break;
            }
        }
    }

    public set domImage(value: IImage) {
        this._domImage = value;
        this._loaded = false;
        this._imageDataCache.data = null;

        if (this._domImage.width) {
            this._onImageLoaded();
        } else {
            this._domImage.onload = () => {
                this._onImageLoaded();
            };
        }
    }

    public get domImage(): IImage {
        return this._domImage;
    }

    private _onImageLoaded(): void {
        this._imageDataCache.data = null;
        this._imageWidth = this._domImage.width;
        this._imageHeight = this._domImage.height;
        this._loaded = true;

        if (this._populateNinePatchSlicesFromImage) {
            this._extractNinePatchSliceDataFromImage();
        }

        this.onImageLoadedObservable.notifyObservers(this);

        if (this._autoScale) {
            this.synchronizeSizeWithContent();
        }
    }

    public get source(): Nullable<string> {
        return this._source;
    }

    public static ResetImageCache(): void {
        ImageContainer.SourceImgCache.clear();
    }

    private _removeCacheUsage(source: Nullable<string>): void {
        if (source && ImageContainer.SourceImgCache.has(source)) {
            const cache = ImageContainer.SourceImgCache.get(source)!;
            cache.timesUsed--;

            if (cache.timesUsed === 0) {
                ImageContainer.SourceImgCache.delete(source);
            }
        }
    }

    public set source(value: Nullable<string>) {
        if (this._source === value) {
            return;
        }

        this._removeCacheUsage(this._source);

        this._loaded = false;
        this._source = value;

        if (value) {
            let cache = ImageContainer.SourceImgCache.get(value);

            if (!cache) {
                cache = {
                    img: new Image() as any,
                    timesUsed: 1,
                    loaded: false,
                    waitingForLoadCallback: []
                };
                ImageContainer.SourceImgCache.set(value, cache);
            } else {
                cache.timesUsed++;
            }

            const img = cache.img;

            if (cache.loaded) {
                this.domImage = img;
            } else {
                cache.waitingForLoadCallback.push(() => {
                    this.domImage = img;
                });

                if (cache.waitingForLoadCallback.length === 1) {
                    if (this.referrerPolicy) {
                        (img as any).referrerPolicy = this.referrerPolicy;
                    }

                    img.onload = () => {
                        cache!.loaded = true;
                        cache!.waitingForLoadCallback.forEach(callback => callback());
                        cache!.waitingForLoadCallback.length = 0;
                    };

                    if (Tools.IsWindowObjectExist()) {
                        if (value.startsWith("data:") || value.startsWith("blob:")) {
                            img.src = value;
                        } else {
                            img.src = this._svgCheck(value);
                        }
                    }
                }
            }
        }

        this._markAsDirty();
    }

    private _sanitizeSVG(value: string): string {
        if (!Tools.IsWindowObjectExist()) {
            return value;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(value, "image/svg+xml");

        const sanitizeElement = (element: Element) => {
            const tagName = element.tagName.toLowerCase();
            if (tagName === "script" || tagName === "object" || tagName === "embed" || tagName === "iframe") {
                element.remove();
                return;
            }

            for (let i = element.attributes.length - 1; i >= 0; i--) {
                const attr = element.attributes[i];
                if (attr.name.startsWith("on") || attr.name === "href" || attr.name === "xlink:href") {
                    element.removeAttribute(attr.name);
                }
            }

            for (let i = 0; i < element.children.length; i++) {
                sanitizeElement(element.children[i]);
            }
        };

        if (doc.documentElement) {
            sanitizeElement(doc.documentElement);
        }

        return new XMLSerializer().serializeToString(doc);
    }

    private _svgCheck(value: string): string {
        if (!value.toLowerCase().includes(".svg")) {
            return value;
        }

        this._isSVG = true;

        if (value.startsWith("data:")) {
            const base64Data = value.split(",")[1];
            const svgContent = atob(base64Data);
            const sanitizedSVG = this._sanitizeSVG(svgContent);
            const sanitizedBase64 = btoa(sanitizedSVG);
            return `data:image/svg+xml;base64,${sanitizedBase64}`;
        }

        const svgImage = new Image();
        svgImage.onload = () => {
            this._getSVGAttribs(svgImage);
            this.onSVGAttributesComputedObservable.notifyObservers(this);
        };
        svgImage.src = value;

        return value;
    }

    private _getSVGAttribs(svgImage: HTMLImageElement): void {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        const size = 64;
        canvas.width = size;
        canvas.height = size;

        context.drawImage(svgImage, 0, 0, size, size);
        const imageData = context.getImageData(0, 0, size, size);

        let minX = size, minY = size, maxX = 0, maxY = 0;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const alpha = imageData.data[(y * size + x) * 4 + 3];
                if (alpha > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        const scaleX = svgImage.width / size;
        const scaleY = svgImage.height / size;

        this._sourceLeft = minX * scaleX;
        this._sourceTop = minY * scaleY;
        this._sourceWidth = (maxX - minX + 1) * scaleX;
        this._sourceHeight = (maxY - minY + 1) * scaleY;

        this._svgAttributesComputationCompleted = true;
    }

    @serialize()
    public get cellWidth(): number {
        return this._cellWidth;
    }
    public set cellWidth(value: number) {
        if (this._cellWidth === value) {
            return;
        }

        this._cellWidth = value;
        this._markAsDirty();
    }

    @serialize()
    public get cellHeight(): number {
        return this._cellHeight;
    }
    public set cellHeight(value: number) {
        if (this._cellHeight === value) {
            return;
        }

        this._cellHeight = value;
        this._markAsDirty();
    }

    @serialize()
    public get cellId(): number {
        return this._cellId;
    }
    public set cellId(value: number) {
        if (this._cellId === value) {
            return;
        }

        this._cellId = value;
        this._markAsDirty();
    }

    public constructor(name?: string) {
        super(name);
    }

    public override contains(x: number, y: number): boolean {
        if (!super.contains(x, y)) {
            return false;
        }

        if (!this._detectPointerOnOpaqueOnly || !this._loaded) {
            return true;
        }

        let canvas: Nullable<ICanvas>;

        if (this._workingCanvas) {
            canvas = this._workingCanvas;
        } else {
            return true;
        }

        const context = canvas.getContext("2d");
        const imageData = context.getImageData(x - this._currentMeasure.left, y - this._currentMeasure.top, 1, 1);
        return imageData.data[3] > 0;
    }

    public override _getTypeName(): string {
        return "ImageContainer";
    }

    public synchronizeSizeWithContent(): void {
        if (!this._loaded) {
            return;
        }

        this.widthInPixels = this._domImage.width;
        this.heightInPixels = this._domImage.height;
    }

    protected override _processMeasures(parentMeasure: Measure, context: ICanvasRenderingContext): void {
        if (this._loaded) {
            switch (this._stretch) {
                case ImageContainer.STRETCH_NONE:
                case ImageContainer.STRETCH_FILL:
                case ImageContainer.STRETCH_UNIFORM:
                case ImageContainer.STRETCH_EXTEND:
                case ImageContainer.STRETCH_NINE_PATCH:
                    if (this._autoScale) {
                        this.synchronizeSizeWithContent();
                    }
                    if (this.parent && this.parent.parent) {
                        this.parent.adaptWidthToChildren = true;
                        this.parent.adaptHeightToChildren = true;
                    }
                    break;
            }
        }

        super._processMeasures(parentMeasure, context);
    }

    private _prepareWorkingCanvasForOpaqueDetection() {
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

    private _drawImage(context: ICanvasRenderingContext, sx: number, sy: number, sw: number, sh: number, tx: number, ty: number, tw: number, th: number) {
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
        if (this.cellId == -1) {
            x = this._sourceLeft;
            y = this._sourceTop;

            width = this._sourceWidth ? this._sourceWidth : this._imageWidth;
            height = this._sourceHeight ? this._sourceHeight : this._imageHeight;
        } else {
            const rowCount = this._domImage.naturalWidth / this.cellWidth;
            const column = (this.cellId / rowCount) >> 0;
            const row = this.cellId % rowCount;

            x = this.cellWidth * row;
            y = this.cellHeight * column;
            width = this.cellWidth;
            height = this.cellHeight;
        }

        this._prepareWorkingCanvasForOpaqueDetection();

        this._applyStates(context);
        if (this._loaded) {
            switch (this._stretch) {
                case ImageContainer.STRETCH_NONE:
                    this._drawImage(context, x, y, width, height, this._currentMeasure.left, this._currentMeasure.top, this._currentMeasure.width, this._currentMeasure.height);
                    break;
                case ImageContainer.STRETCH_FILL:
                    this._drawImage(context, x, y, width, height, this._currentMeasure.left, this._currentMeasure.top, this._currentMeasure.width, this._currentMeasure.height);
                    break;
                case ImageContainer.STRETCH_UNIFORM: {
                    const hRatio = this._currentMeasure.width / width;
                    const vRatio = this._currentMeasure.height / height;
                    const ratio = Math.min(hRatio, vRatio);
                    const centerX = (this._currentMeasure.width - width * ratio) / 2;
                    const centerY = (this._currentMeasure.height - height * ratio) / 2;

                    this._drawImage(context, x, y, width, height, this._currentMeasure.left + centerX, this._currentMeasure.top + centerY, width * ratio, height * ratio);
                    break;
                }
                case ImageContainer.STRETCH_EXTEND:
                    this._drawImage(context, x, y, width, height, this._currentMeasure.left, this._currentMeasure.top, this._currentMeasure.width, this._currentMeasure.height);
                    break;
                case ImageContainer.STRETCH_NINE_PATCH:
                    this._renderNinePatch(context, x, y, width, height);
                    break;
            }
        }

        context.restore();
    }

    private _renderNinePatch(context: ICanvasRenderingContext, sx: number, sy: number, sw: number, sh: number): void {
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
        this._drawImage(
            context,
            sx + this._sliceRight,
            sy + this._sliceTop,
            rightWidth,
            centerHeight,
            rightOffset,
            centerTopOffset + 1,
            rightWidthAdjusted,
            targetCenterHeight - 2
        );
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

    public override _parseFromContent(serializedObject: any, host: any, urlRewriter?: (url: string) => string): void {
        super._parseFromContent(serializedObject, host, urlRewriter);
        
        if (serializedObject.source !== undefined) {
            this.source = urlRewriter ? urlRewriter(serializedObject.source) : serializedObject.source;
        }
        if (serializedObject.stretch !== undefined) {
            this.stretch = serializedObject.stretch;
        }
        if (serializedObject.sliceLeft !== undefined) {
            this.sliceLeft = serializedObject.sliceLeft;
        }
        if (serializedObject.sliceRight !== undefined) {
            this.sliceRight = serializedObject.sliceRight;
        }
        if (serializedObject.sliceTop !== undefined) {
            this.sliceTop = serializedObject.sliceTop;
        }
        if (serializedObject.sliceBottom !== undefined) {
            this.sliceBottom = serializedObject.sliceBottom;
        }
        if (serializedObject.sourceLeft !== undefined) {
            this.sourceLeft = serializedObject.sourceLeft;
        }
        if (serializedObject.sourceTop !== undefined) {
            this.sourceTop = serializedObject.sourceTop;
        }
        if (serializedObject.sourceWidth !== undefined) {
            this.sourceWidth = serializedObject.sourceWidth;
        }
        if (serializedObject.sourceHeight !== undefined) {
            this.sourceHeight = serializedObject.sourceHeight;
        }
        if (serializedObject.cellWidth !== undefined) {
            this.cellWidth = serializedObject.cellWidth;
        }
        if (serializedObject.cellHeight !== undefined) {
            this.cellHeight = serializedObject.cellHeight;
        }
        if (serializedObject.cellId !== undefined) {
            this.cellId = serializedObject.cellId;
        }
        if (serializedObject.autoScale !== undefined) {
            this.autoScale = serializedObject.autoScale;
        }
        if (serializedObject.detectPointerOnOpaqueOnly !== undefined) {
            this.detectPointerOnOpaqueOnly = serializedObject.detectPointerOnOpaqueOnly;
        }
        if (serializedObject.populateNinePatchSlicesFromImage !== undefined) {
            this.populateNinePatchSlicesFromImage = serializedObject.populateNinePatchSlicesFromImage;
        }
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

RegisterClass("BABYLON.GUI.ImageContainer", ImageContainer);
