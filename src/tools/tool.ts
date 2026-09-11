export interface NeuraiTool<I = unknown, O = unknown> { id: string; description: string; execute(input: I): Promise<O>; }
