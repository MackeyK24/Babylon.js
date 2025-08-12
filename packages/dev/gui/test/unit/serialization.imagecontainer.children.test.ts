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
describe("GUI ImageContainer custom control deserialization", () => {
    it("parses ImageContainer with a Rectangle child", () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);

        const adt = AdvancedDynamicTexture.CreateFullscreenUI("test-ui-imagecontainer-custom", true, scene);

        const serialized = {
            root: {
                className: "ImageContainer",
                name: "rootImageContainer",
                width: "200px",
                height: "100px",
                children: [{ className: "Rectangle", name: "childRect", width: "50px", height: "25px" }],
            },
            width: 1024,
            height: 512,
        };
        adt.parseSerializedObject(serialized);

        const root: any = adt.rootContainer as any;
        expect(root).toBeTruthy();
        const rootClass = typeof root.getClassName === "function" ? root.getClassName() : root.constructor.name;
        expect(rootClass === "ImageContainer" || rootClass === "Container").toBeTruthy();
        expect(root.children?.length).toBe(2);
        const childRect = root.children.find((c: any) => (typeof c.getClassName === "function" ? c.getClassName() : c.constructor.name) === "Rectangle");
        expect(childRect).toBeTruthy();
    });
});
