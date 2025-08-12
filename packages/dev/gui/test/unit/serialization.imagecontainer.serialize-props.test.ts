import { NullEngine } from "../../../core/src/Engines/nullEngine";
import { Scene } from "../../../core/src/scene";
import { AdvancedDynamicTexture } from "../../src/2D/advancedDynamicTexture";
import "../../src/2D/controls/imageContainer";

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
/* Ensure window and document exist for Tools.Instantiate and NullEngine image creation in Node */
if (typeof (global as any).window === "undefined") {
    (global as any).window = global as any;
}
if (typeof (global as any).document === "undefined") {
    const make2DContext = () =>
        ({
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
        }) as any;

    (global as any).document = {
        createElement: (tag: string) => {
            if (tag === "img") {
                const listeners: Record<string, Function[]> = {};
                let _src = "";
                return {
                    addEventListener: (type: string, cb: Function) => {
                        (listeners[type] ||= []).push(cb);
                    },
                    removeEventListener: (type: string, cb: Function) => {
                        const arr = listeners[type];
                        if (!arr) {
                            return;
                        }
                        const idx = arr.indexOf(cb);
                        if (idx >= 0) {
                            arr.splice(idx, 1);
                        }
                    },
                    set src(v: string) {
                        _src = v;
                        const arr = listeners["load"] || [];
                        for (const cb of arr) {
                            try {
                                cb();
                            } catch {}
                        }
                    },
                    get src() {
                        return _src;
                    },
                    crossOrigin: null as any,
                    style: {},
                    width: 0,
                    height: 0,
                } as any;
            }
            if (tag === "canvas") {
                return {
                    width: 0,
                    height: 0,
                    getContext: (_type: string) => make2DContext(),
                    toDataURL: () => "",
                } as any;
            }
            return {} as any;
        },
    } as any;
}

describe("GUI ImageContainer serialize properties", () => {
    it("serializes proxied Image properties via @serialize", () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const adt = AdvancedDynamicTexture.CreateFullscreenUI("serialize-ic", true, scene);

        const serialized = {
            root: {
                className: "ImageContainer",
                name: "ic",
                width: "100px",
                height: "50px",
                source: "tex.png",
                sourceLeft: 1,
                sourceTop: 2,
                sourceWidth: 64,
                sourceHeight: 32,
                stretch: 4,
                populateNinePatchSlicesFromImage: true,
                sliceLeft: 3,
                sliceRight: 4,
                sliceTop: 5,
                sliceBottom: 6,
                cellWidth: 16,
                cellHeight: 16,
                cellId: 2,
                autoScale: false,
                detectPointerOnOpaqueOnly: true,
                children: [],
            },
            width: 256,
            height: 256,
        };
        adt.parseSerializedObject(serialized);

        const root: any = adt.rootContainer as any;
        const roundTrip: any = {};
        root.serialize?.(roundTrip);
        expect(roundTrip).toBeTruthy();

        expect(roundTrip.source).toBe("tex.png");
        expect(roundTrip.sourceLeft).toBe(1);
        expect(roundTrip.sourceTop).toBe(2);
        expect(roundTrip.sourceWidth).toBe(64);
        expect(roundTrip.sourceHeight).toBe(32);
        expect(roundTrip.stretch).toBe(4);
        expect(roundTrip.populateNinePatchSlicesFromImage).toBe(true);
        expect(roundTrip.sliceLeft).toBe(3);
        expect(roundTrip.sliceRight).toBe(4);
        expect(roundTrip.sliceTop).toBe(5);
        expect(roundTrip.sliceBottom).toBe(6);
        expect(roundTrip.cellWidth).toBe(16);
        expect(roundTrip.cellHeight).toBe(16);
        expect(roundTrip.cellId).toBe(2);
        expect(roundTrip.autoScale).toBe(false);
        expect(roundTrip.detectPointerOnOpaqueOnly).toBe(true);
    });
});
