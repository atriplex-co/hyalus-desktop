import { Field, Message } from "protobufjs";

export class CallStreamData extends Message<CallStreamData> {
  @Field.d(1, "bytes")
  public data!: Uint8Array;
  @Field.d(2, "string")
  public type!: string;
  @Field.d(3, "int64")
  public timestamp!: number;
  @Field.d(4, "int64")
  public duration!: number;
  @Field.d(5, "bytes")
  public decoderConfig!: Uint8Array;
  @Field.d(6, "bool")
  public decoderConfigUpdate!: boolean;
}

export class CallStreamDecoderConfig extends Message<CallStreamDecoderConfig> {
  @Field.d(1, "string")
  public codec?: string;
  @Field.d(2, "bytes")
  public description?: Uint8Array;
  @Field.d(3, "int64")
  public numberOfChannels?: number;
  @Field.d(4, "int64")
  public sampleRate?: number;
}
