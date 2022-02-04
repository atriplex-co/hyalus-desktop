import protobuf from "protobufjs";

export class CallStreamData extends protobuf.Message<CallStreamData> {
  @protobuf.Field.d(1, "bytes")
  public data!: Uint8Array;
  @protobuf.Field.d(2, "string")
  public type!: string;
  @protobuf.Field.d(3, "int64")
  public timestamp!: number;
  @protobuf.Field.d(4, "int64")
  public duration!: number;
  @protobuf.Field.d(5, "bytes")
  public decoderConfig!: Uint8Array;
  @protobuf.Field.d(6, "bool")
  public decoderConfigUpdate!: boolean;
}

export class CallStreamDecoderConfig extends protobuf.Message<CallStreamDecoderConfig> {
  @protobuf.Field.d(1, "string")
  public codec?: string;
  @protobuf.Field.d(2, "bytes")
  public description?: Uint8Array;
  @protobuf.Field.d(3, "int64")
  public numberOfChannels?: number;
  @protobuf.Field.d(4, "int64")
  public sampleRate?: number;
}
