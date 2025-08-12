import { NullEngine } from "../../../core/src/Engines/nullEngine";
import { Scene } from "../../../core/src/scene";
import { AdvancedDynamicTexture } from "../../src/2D/advancedDynamicTexture";
import { Rectangle } from "../../src/2D/controls/rectangle";
import type { Container } from "../../src/2D/controls/container";
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

describe("GUI Image deserialization with children", () => {
    it("parses Image with a Rectangle child from serialized JSON", () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);

        const adt = AdvancedDynamicTexture.CreateFullscreenUI("test-ui", true, scene);

        const serialized = {
            root: {
                className: "Image",
                name: "rootImage",
                width: "200px",
                height: "100px",
                children: [{ className: "Rectangle", name: "childRect", width: "50px", height: "25px" }],
            },
            width: 1024,
            height: 512,
        };
        adt.parseSerializedObject(serialized);

        const root = adt.rootContainer as unknown as Container;
        expect(root).toBeTruthy();
        expect(typeof (root as any).getClassName === "function" ? (root as any).getClassName() : (root as any).constructor.name).toBe("Image");
        expect((root as any).children).toBeTruthy();
        expect((root as any).children.length).toBe(1);
        const child = (root as any).children[0];
        expect(typeof child.getClassName === "function" ? child.getClassName() : child.constructor.name).toBe("Rectangle");
        expect(child).toBeInstanceOf(Rectangle);
    });
});
