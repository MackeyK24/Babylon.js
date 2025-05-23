import type { VertexBuffer, Buffer } from "../Buffers/buffer";
import type { ThinEngine } from "../Engines/thinEngine";
import type { Effect, IEffectCreationOptions } from "../Materials/effect";
import type { IGPUParticleSystemPlatform } from "./IGPUParticleSystemPlatform";

import { CustomParticleEmitter } from "./EmitterTypes/customParticleEmitter";
import type { GPUParticleSystem } from "./gpuParticleSystem";
import type { DataArray, Nullable } from "../types";
import type { DataBuffer } from "../Buffers/dataBuffer";
import { UniformBufferEffectCommonAccessor } from "../Materials/uniformBufferEffectCommonAccessor";
import { Constants } from "../Engines/constants";
import { RegisterClass } from "../Misc/typeStore";

import "../Shaders/gpuUpdateParticles.fragment";
import "../Shaders/gpuUpdateParticles.vertex";

import type { Engine } from "../Engines/engine";

/** @internal */
export class WebGL2ParticleSystem implements IGPUParticleSystemPlatform {
    private _parent: GPUParticleSystem;
    private _engine: ThinEngine;
    private _updateEffect: Effect;
    private _updateEffectOptions: IEffectCreationOptions;
    private _renderVAO: WebGLVertexArrayObject[] = [];
    private _updateVAO: WebGLVertexArrayObject[] = [];
    private _renderVertexBuffers: { [key: string]: VertexBuffer };

    /** @internal */
    public readonly alignDataInBuffer = false;

    /** @internal */
    constructor(parent: GPUParticleSystem, engine: ThinEngine) {
        this._parent = parent;
        this._engine = engine;

        this._updateEffectOptions = {
            attributes: [
                "position",
                "initialPosition",
                "age",
                "life",
                "seed",
                "size",
                "color",
                "direction",
                "initialDirection",
                "angle",
                "cellIndex",
                "cellStartOffset",
                "noiseCoordinates1",
                "noiseCoordinates2",
            ],
            uniformsNames: [
                "currentCount",
                "timeDelta",
                "emitterWM",
                "lifeTime",
                "color1",
                "color2",
                "sizeRange",
                "scaleRange",
                "gravity",
                "emitPower",
                "direction1",
                "direction2",
                "minEmitBox",
                "maxEmitBox",
                "radius",
                "directionRandomizer",
                "height",
                "coneAngle",
                "stopFactor",
                "angleRange",
                "radiusRange",
                "cellInfos",
                "noiseStrength",
                "limitVelocityDamping",
                "flowMapProjection",
                "flowMapStrength",
            ],
            uniformBuffersNames: [],
            samplers: [
                "randomSampler",
                "randomSampler2",
                "sizeGradientSampler",
                "angularSpeedGradientSampler",
                "velocityGradientSampler",
                "limitVelocityGradientSampler",
                "noiseSampler",
                "dragGradientSampler",
                "flowMapSampler",
            ],
            defines: "",
            fallbacks: null,
            onCompiled: null,
            onError: null,
            indexParameters: null,
            maxSimultaneousLights: 0,
            transformFeedbackVaryings: [],
        };
    }

    /** @internal */
    public contextLost(): void {
        this._updateEffect = undefined as any;
        this._renderVAO.length = 0;
        this._updateVAO.length = 0;
    }

    /** @internal */
    public isUpdateBufferCreated(): boolean {
        return !!this._updateEffect;
    }

    /** @internal */
    public isUpdateBufferReady(): boolean {
        return this._updateEffect?.isReady() ?? false;
    }

    /** @internal */
    public createUpdateBuffer(defines: string): UniformBufferEffectCommonAccessor {
        this._updateEffectOptions.transformFeedbackVaryings = ["outPosition"];
        this._updateEffectOptions.transformFeedbackVaryings.push("outAge");
        this._updateEffectOptions.transformFeedbackVaryings.push("outSize");
        this._updateEffectOptions.transformFeedbackVaryings.push("outLife");
        this._updateEffectOptions.transformFeedbackVaryings.push("outSeed");
        this._updateEffectOptions.transformFeedbackVaryings.push("outDirection");

        if (this._parent.particleEmitterType instanceof CustomParticleEmitter) {
            this._updateEffectOptions.transformFeedbackVaryings.push("outInitialPosition");
        }

        if (!this._parent._colorGradientsTexture) {
            this._updateEffectOptions.transformFeedbackVaryings.push("outColor");
        }

        if (!this._parent._isBillboardBased) {
            this._updateEffectOptions.transformFeedbackVaryings.push("outInitialDirection");
        }

        if (this._parent.noiseTexture) {
            this._updateEffectOptions.transformFeedbackVaryings.push("outNoiseCoordinates1");
            this._updateEffectOptions.transformFeedbackVaryings.push("outNoiseCoordinates2");
        }

        this._updateEffectOptions.transformFeedbackVaryings.push("outAngle");

        if (this._parent.isAnimationSheetEnabled) {
            this._updateEffectOptions.transformFeedbackVaryings.push("outCellIndex");
            if (this._parent.spriteRandomStartCell) {
                this._updateEffectOptions.transformFeedbackVaryings.push("outCellStartOffset");
            }
        }

        this._updateEffectOptions.defines = defines;
        this._updateEffect = this._engine.createEffect("gpuUpdateParticles", this._updateEffectOptions, this._engine);

        return new UniformBufferEffectCommonAccessor(this._updateEffect);
    }

    /** @internal */
    public createVertexBuffers(updateBuffer: Buffer, renderVertexBuffers: { [key: string]: VertexBuffer }): void {
        this._updateVAO.push(this._createUpdateVAO(updateBuffer));

        this._renderVAO.push(this._engine.recordVertexArrayObject(renderVertexBuffers, null, this._parent._getWrapper(this._parent.blendMode).effect!));
        this._engine.bindArrayBuffer(null);

        this._renderVertexBuffers = renderVertexBuffers;
    }

    /** @internal */
    public createParticleBuffer(data: number[]): DataArray | DataBuffer {
        return data;
    }

    /** @internal */
    public bindDrawBuffers(index: number, effect: Effect, indexBuffer: Nullable<DataBuffer>): void {
        if (indexBuffer) {
            this._engine.bindBuffers(this._renderVertexBuffers, indexBuffer, effect);
        } else {
            this._engine.bindVertexArrayObject(this._renderVAO[index], null);
        }
    }

    /** @internal */
    public preUpdateParticleBuffer(): void {
        const engine = this._engine as Engine;

        this._engine.enableEffect(this._updateEffect);

        if (!engine.setState) {
            throw new Error("GPU particles cannot work without a full Engine. ThinEngine is not supported");
        }
    }

    /** @internal */
    public updateParticleBuffer(index: number, targetBuffer: Buffer, currentActiveCount: number): void {
        this._updateEffect.setTexture("randomSampler", this._parent._randomTexture);
        this._updateEffect.setTexture("randomSampler2", this._parent._randomTexture2);

        if (this._parent._flowMap) {
            this._updateEffect.setTexture("flowMapSampler", this._parent._flowMap);
        }

        if (this._parent._sizeGradientsTexture) {
            this._updateEffect.setTexture("sizeGradientSampler", this._parent._sizeGradientsTexture);
        }

        if (this._parent._angularSpeedGradientsTexture) {
            this._updateEffect.setTexture("angularSpeedGradientSampler", this._parent._angularSpeedGradientsTexture);
        }

        if (this._parent._velocityGradientsTexture) {
            this._updateEffect.setTexture("velocityGradientSampler", this._parent._velocityGradientsTexture);
        }

        if (this._parent._limitVelocityGradientsTexture) {
            this._updateEffect.setTexture("limitVelocityGradientSampler", this._parent._limitVelocityGradientsTexture);
        }

        if (this._parent._dragGradientsTexture) {
            this._updateEffect.setTexture("dragGradientSampler", this._parent._dragGradientsTexture);
        }

        if (this._parent.noiseTexture) {
            this._updateEffect.setTexture("noiseSampler", this._parent.noiseTexture);
        }

        // Bind source VAO
        this._engine.bindVertexArrayObject(this._updateVAO[index], null);

        // Update
        const engine = this._engine as Engine;

        engine.bindTransformFeedbackBuffer(targetBuffer.getBuffer());
        engine.setRasterizerState(false);
        engine.beginTransformFeedback(true);
        engine.drawArraysType(Constants.MATERIAL_PointListDrawMode, 0, currentActiveCount);
        engine.endTransformFeedback();
        engine.setRasterizerState(true);
        engine.bindTransformFeedbackBuffer(null);
    }

    /** @internal */
    public releaseBuffers(): void {}

    /** @internal */
    public releaseVertexBuffers(): void {
        for (let index = 0; index < this._updateVAO.length; index++) {
            this._engine.releaseVertexArrayObject(this._updateVAO[index]);
        }
        this._updateVAO.length = 0;

        for (let index = 0; index < this._renderVAO.length; index++) {
            this._engine.releaseVertexArrayObject(this._renderVAO[index]);
        }
        this._renderVAO.length = 0;
    }

    private _createUpdateVAO(source: Buffer): WebGLVertexArrayObject {
        const updateVertexBuffers: { [key: string]: VertexBuffer } = {};
        updateVertexBuffers["position"] = source.createVertexBuffer("position", 0, 3);

        let offset = 3;
        updateVertexBuffers["age"] = source.createVertexBuffer("age", offset, 1);
        offset += 1;
        updateVertexBuffers["size"] = source.createVertexBuffer("size", offset, 3);
        offset += 3;
        updateVertexBuffers["life"] = source.createVertexBuffer("life", offset, 1);
        offset += 1;
        updateVertexBuffers["seed"] = source.createVertexBuffer("seed", offset, 4);
        offset += 4;
        updateVertexBuffers["direction"] = source.createVertexBuffer("direction", offset, 3);
        offset += 3;

        if (this._parent.particleEmitterType instanceof CustomParticleEmitter) {
            updateVertexBuffers["initialPosition"] = source.createVertexBuffer("initialPosition", offset, 3);
            offset += 3;
        }

        if (!this._parent._colorGradientsTexture) {
            updateVertexBuffers["color"] = source.createVertexBuffer("color", offset, 4);
            offset += 4;
        }

        if (!this._parent._isBillboardBased) {
            updateVertexBuffers["initialDirection"] = source.createVertexBuffer("initialDirection", offset, 3);
            offset += 3;
        }

        if (this._parent.noiseTexture) {
            updateVertexBuffers["noiseCoordinates1"] = source.createVertexBuffer("noiseCoordinates1", offset, 3);
            offset += 3;
            updateVertexBuffers["noiseCoordinates2"] = source.createVertexBuffer("noiseCoordinates2", offset, 3);
            offset += 3;
        }

        if (this._parent._angularSpeedGradientsTexture) {
            updateVertexBuffers["angle"] = source.createVertexBuffer("angle", offset, 1);
            offset += 1;
        } else {
            updateVertexBuffers["angle"] = source.createVertexBuffer("angle", offset, 2);
            offset += 2;
        }

        if (this._parent._isAnimationSheetEnabled) {
            updateVertexBuffers["cellIndex"] = source.createVertexBuffer("cellIndex", offset, 1);
            offset += 1;
            if (this._parent.spriteRandomStartCell) {
                updateVertexBuffers["cellStartOffset"] = source.createVertexBuffer("cellStartOffset", offset, 1);
                offset += 1;
            }
        }

        const vao = this._engine.recordVertexArrayObject(updateVertexBuffers, null, this._updateEffect);
        this._engine.bindArrayBuffer(null);

        return vao;
    }
}

RegisterClass("BABYLON.WebGL2ParticleSystem", WebGL2ParticleSystem);
