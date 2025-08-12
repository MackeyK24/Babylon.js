import { NullEngine } from "../../../core/src/Engines/nullEngine";
import { Scene } from "../../../core/src/scene";
import { AdvancedDynamicTexture } from "../../src/2D/advancedDynamicTexture";
import "../../src/2D/controls/imageContainer";
import "../../src/2D/controls/image";
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
describe("GUI ImageContainer deserialization", () => {
    it("parses ImageContainer with an Image child", () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);

        const adt = AdvancedDynamicTexture.CreateFullscreenUI("test-ui-imagecontainer", true, scene);

        const serialized = {
            root: {
                className: "ImageContainer",
                name: "rootImageContainer",
                width: "100px",
                height: "50px",
                children: [{ className: "Image", name: "childImage", width: "25px", height: "25px" }],
            },
            width: 256,
            height: 256,
        };
        adt.parseSerializedObject(serialized);

        const root: any = adt.rootContainer as any;
        expect(root).toBeTruthy();
        const rootClass = typeof root.getClassName === "function" ? root.getClassName() : root.constructor.name;
        expect(rootClass === "ImageContainer" || rootClass === "Container").toBeTruthy();
        expect(root.children?.length).toBe(2);
        const hasChildImage = root.children.some((c: any) => (typeof c.getClassName === "function" ? c.getClassName() : c.constructor.name) === "Image");
        expect(hasChildImage).toBeTruthy();
    });
});
