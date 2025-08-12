import { NullEngine } from "../../../core/src/Engines/nullEngine";
import { Scene } from "../../../core/src/scene";
import { AdvancedDynamicTexture } from "../../src/2D/advancedDynamicTexture";
import "../../src/2D/controls/imageContainer";
import "../../src/2D/controls/rectangle";
/* Polyfill OffscreenCanvas for Node test environment */
if (typeof (global as any).OffscreenCanvas === "undefined") {
    (global as any).OffscreenCanvas = class {
        width: number;
        height: number;
        constructor(width: number, height: number) {
            this.width = width;
            this.height = height;
        }
        getContext() {
            return {
                drawImage() {},
                measureText() {
                    return { width: 0 };
                },
                fillRect() {},
                strokeRect() {},
                beginPath() {},
                moveTo() {},
                lineTo() {},
                arc() {},
                closePath() {},
                fill() {},
                stroke() {},
                save() {},
                restore() {},
                translate() {},
                rotate() {},
                scale() {},
                clearRect() {},
                createLinearGradient() {
                    return { addColorStop() {} };
                },
                createRadialGradient() {
                    return { addColorStop() {} };
                },
            } as any;
        }
        toDataURL() {
            return "";
        }
    } as any;
}
/* Ensure window exists for Tools.Instantiate in Node */
if (typeof (global as any).window === "undefined") {
    (global as any).window = global as any;
}
describe("GUI nested ImageContainer deserialization", () => {
    it("parses nested ImageContainer with leaf children", () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const adt = AdvancedDynamicTexture.CreateFullscreenUI("nested-ic", true, scene);
        const serialized = {
            root: {
                className: "ImageContainer",
                name: "rootIC",
                width: "200px",
                height: "100px",
                children: [
                    {
                        className: "ImageContainer",
                        name: "childIC",
                        width: "100px",
                        height: "50px",
                        children: [{ className: "Rectangle", name: "leafRect", width: "20px", height: "10px" }],
                    },
                ],
            },
            width: 512,
            height: 512,
        };
        adt.parseSerializedObject(serialized);
        const root: any = adt.rootContainer as any;
        expect(root).toBeTruthy();
        const childIC = root.children.find((c: any) => c.name === "childIC");
        expect(childIC).toBeTruthy();
        const hasRootInternalImage = root.children.some((c: any) => (typeof c.getClassName === "function" ? c.getClassName() : c.constructor.name) === "Image");
        expect(hasRootInternalImage).toBeTruthy();
        const hasChildInternalImage = childIC.children.some((c: any) => (typeof c.getClassName === "function" ? c.getClassName() : c.constructor.name) === "Image");
        expect(hasChildInternalImage).toBeTruthy();
        const leafRect = childIC.children.find((c: any) => (typeof c.getClassName === "function" ? c.getClassName() : c.constructor.name) === "Rectangle");
        expect(leafRect).toBeTruthy();
    });
});
