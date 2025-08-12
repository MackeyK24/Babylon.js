import { AdvancedDynamicTexture, Rectangle } from "../../src/index";
import type { Container } from "../../src/2D/controls/container";

describe("GUI Image deserialization with children", () => {
    it("parses Image with a Rectangle child from serialized JSON", () => {
        const adt = AdvancedDynamicTexture.CreateFullscreenUI("test-ui");
        const serialized = {
            root: {
                className: "Image",
                name: "rootImage",
                width: "200px",
                height: "100px",
                children: [
                    { className: "Rectangle", name: "childRect", width: "50px", height: "25px" }
                ]
            },
            width: 1024,
            height: 512
        };
        adt.parseSerializedObject(serialized);

        const root = (adt.rootContainer as Container).getChildByName("rootImage") as any;
        expect(root).toBeTruthy();
        expect(typeof root.getClassName === "function" ? root.getClassName() : root.constructor.name).toBe("Image");
        expect(root.children).toBeTruthy();
        expect(root.children.length).toBe(1);
        const child = root.children[0];
        expect(typeof child.getClassName === "function" ? child.getClassName() : child.constructor.name).toBe("Rectangle");
        expect(child).toBeInstanceOf(Rectangle);
    });
});
