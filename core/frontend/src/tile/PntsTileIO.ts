/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
/** @module Tile */
import { TileIO } from "./TileIO";
import { ElementAlignedBox3d, QParams3d, Quantization, Feature, FeatureTable } from "@bentley/imodeljs-common";
import { assert } from "@bentley/bentleyjs-core";
import { RenderSystem, RenderGraphic, GraphicBranch } from "../render/System";
import { GeometricModelState } from "../ModelState";
import { StringUtils } from "@bentley/bentleyjs-core";
import { PointCloudArgs } from "../render/primitives/PointCloudPrimitive";
import { Point3d } from "@bentley/geometry-core/lib/PointVector";
import { Transform, RotMatrix, Angle, Vector3d } from "@bentley/geometry-core";

/** Deserializes an Pnts tile. */
export namespace PntsTileIO {
  class Header extends TileIO.Header {
    public readonly length: number;
    public readonly featureTableJsonLength: number;
    public readonly featureTableBinaryLength: number;
    public readonly batchTableJsonLength: number;
    public readonly batchTableBinaryLength: number;
    public get isValid(): boolean { return TileIO.Format.Pnts === this.format; }

    public constructor(stream: TileIO.StreamBuffer) {
      super(stream);
      this.length = stream.nextUint32;
      this.featureTableJsonLength = stream.nextUint32;
      this.featureTableBinaryLength = stream.nextUint32;
      this.batchTableJsonLength = stream.nextUint32;
      this.batchTableBinaryLength = stream.nextUint32;
    }
  }
  export function readPointCloud(stream: TileIO.StreamBuffer, model: GeometricModelState, range: ElementAlignedBox3d, system: RenderSystem, yAxisUp: boolean): RenderGraphic | undefined {
    const header: Header = new Header(stream);

    if (!header.isValid)
      return undefined;

    const featureTableJsonOffset = stream.curPos;
    const featureStrData = stream.nextBytes(header.featureTableJsonLength);
    const featureStr = StringUtils.utf8ToString(featureStrData);
    const featureValue = JSON.parse(featureStr as string);

    if (undefined === featureValue) { }
    if (undefined === featureValue.POSITION_QUANTIZED ||
      undefined === featureValue.QUANTIZED_VOLUME_OFFSET ||
      undefined === featureValue.QUANTIZED_VOLUME_SCALE ||
      undefined === featureValue.POINTS_LENGTH ||
      undefined === featureValue.POSITION_QUANTIZED) {
      assert(false, "quantized point cloud points not found");
      return undefined;
    }

    const qOrigin = new Point3d(featureValue.QUANTIZED_VOLUME_OFFSET[0], featureValue.QUANTIZED_VOLUME_OFFSET[1], featureValue.QUANTIZED_VOLUME_OFFSET[2]);
    const qScale = new Point3d(Quantization.computeScale(featureValue.QUANTIZED_VOLUME_SCALE[0]), Quantization.computeScale(featureValue.QUANTIZED_VOLUME_SCALE[1]), Quantization.computeScale(featureValue.QUANTIZED_VOLUME_SCALE[2]));
    const qParams = QParams3d.fromOriginAndScale(qOrigin, qScale);
    const qPoints = new Uint16Array(stream.arrayBuffer, featureTableJsonOffset + header.featureTableJsonLength + featureValue.POSITION_QUANTIZED.byteOffset, 3 * featureValue.POINTS_LENGTH);
    let colors: Uint8Array | undefined;

    if (undefined !== featureValue.RGB) {
      colors = new Uint8Array(stream.arrayBuffer, featureTableJsonOffset + header.featureTableJsonLength + featureValue.RGB.byteOffset, 3 * featureValue.POINTS_LENGTH);
    } else {
      colors = new Uint8Array(3 * featureValue.POINTS_LENGTH);
      colors.fill(0xff, 0, colors.length);    // TBD... Default color?
    }

    let renderGraphic = system.createPointCloud(new PointCloudArgs(qPoints, qParams, colors), model.iModel);

    // ###TODO? Do we expect a batch table? not currently handled...
    const feature = new Feature(model.id);
    const featureTable = new FeatureTable(1, model.id);
    featureTable.insert(feature);

    renderGraphic = system.createBatch(renderGraphic!, featureTable, range);

    if (yAxisUp) {
      const branch = new GraphicBranch();
      branch.add(renderGraphic!);
      const transform = Transform.createOriginAndMatrix(undefined, RotMatrix.createRotationAroundVector(Vector3d.create(1.0, 0.0, 0.0), Angle.createRadians(Angle.piOver2Radians)) as RotMatrix);

      renderGraphic = system.createBranch(branch, transform);
    }

    return renderGraphic;
  }
}
