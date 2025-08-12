import type { Nullable } from "core/types";
import { Container } from "./container";
import { RegisterClass } from "core/Misc/typeStore";
import { serialize } from "core/Misc/decorators";
import { Image as CoreImage } from "./image";

export class ImageContainer extends Container {
    private _image: CoreImage;

    @serialize()
    public get source(): Nullable<string> {
        return this._image.source;
    }
    public set source(value: Nullable<string>) {
        this._image.source = value;
    }

    @serialize()
    public get sourceLeft(): number {
        return this._image.sourceLeft;
    }
    public set sourceLeft(value: number) {
        this._image.sourceLeft = value;
    }

    @serialize()
    public get sourceTop(): number {
        return this._image.sourceTop;
    }
    public set sourceTop(value: number) {
        this._image.sourceTop = value;
    }

    @serialize()
    public get sourceWidth(): number {
        return this._image.sourceWidth;
    }
    public set sourceWidth(value: number) {
        this._image.sourceWidth = value;
    }

    @serialize()
    public get sourceHeight(): number {
        return this._image.sourceHeight;
    }
    public set sourceHeight(value: number) {
        this._image.sourceHeight = value;
    }

    @serialize()
    public get stretch(): number {
        return this._image.stretch;
    }
    public set stretch(value: number) {
        this._image.stretch = value;
    }

    @serialize()
    public get populateNinePatchSlicesFromImage(): boolean {
        return this._image.populateNinePatchSlicesFromImage;
    }
    public set populateNinePatchSlicesFromImage(value: boolean) {
        this._image.populateNinePatchSlicesFromImage = value;
    }

    @serialize()
    public get sliceLeft(): number {
        return this._image.sliceLeft;
    }
    public set sliceLeft(value: number) {
        this._image.sliceLeft = value;
    }

    @serialize()
    public get sliceRight(): number {
        return this._image.sliceRight;
    }
    public set sliceRight(value: number) {
        this._image.sliceRight = value;
    }

    @serialize()
    public get sliceTop(): number {
        return this._image.sliceTop;
    }
    public set sliceTop(value: number) {
        this._image.sliceTop = value;
    }

    @serialize()
    public get sliceBottom(): number {
        return this._image.sliceBottom;
    }
    public set sliceBottom(value: number) {
        this._image.sliceBottom = value;
    }

    @serialize()
    public get cellWidth(): number {
        return this._image.cellWidth;
    }
    public set cellWidth(value: number) {
        this._image.cellWidth = value;
    }

    @serialize()
    public get cellHeight(): number {
        return this._image.cellHeight;
    }
    public set cellHeight(value: number) {
        this._image.cellHeight = value;
    }

    @serialize()
    public get cellId(): number {
        return this._image.cellId;
    }
    public set cellId(value: number) {
        this._image.cellId = value;
    }

    @serialize()
    public get autoScale(): boolean {
        return this._image.autoScale;
    }
    public set autoScale(value: boolean) {
        this._image.autoScale = value;
    }

    @serialize()
    public get detectPointerOnOpaqueOnly(): boolean {
        return this._image.detectPointerOnOpaqueOnly;
    }
    public set detectPointerOnOpaqueOnly(value: boolean) {
        this._image.detectPointerOnOpaqueOnly = value;
    }

    public override contains(x: number, y: number): boolean {
        if (this._image.detectPointerOnOpaqueOnly) {
            return this._image.contains(x, y);
        }
        return super.contains(x, y);
    }

    public override isReady(): boolean {
        return this._image.isReady();
    }

    protected override _getTypeName(): string {
        return "ImageContainer";
    }

    constructor(
        public override name?: string,
        url: Nullable<string> = null
    ) {
        super(name);
        this.clipChildren = true;
        this._image = new CoreImage(name ? name + "_image" : undefined, url);
        this._image.isHitTestVisible = false;
        this._image.width = "100%";
        this._image.height = "100%";
        this.addControl(this._image);
    }
}
RegisterClass("BABYLON.GUI.ImageContainer", ImageContainer);
