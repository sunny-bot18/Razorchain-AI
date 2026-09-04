import { v4 as uuidv4 } from 'uuid';

export interface AgentResult<T> {
  agentName: string;
  runId: string;
  status: 'success' | 'error' | 'timeout';
  data: T | null;
  confidence: number;
  model: string;
  durationMs: number;
  error?: string;
}

export abstract class BaseAgent<TInput, TOutput> {
  abstract name: string;
  abstract model: string;

  async execute(input: TInput): Promise<AgentResult<TOutput>> {
    const runId = uuidv4();
    const start = Date.now();
    try {
      const data = await this.run(input);
      return {
        agentName: this.name,
        runId,
        status: 'success',
        data,
        confidence: this.getConfidence(data),
        model: this.model,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        agentName: this.name,
        runId,
        status: 'error',
        data: null,
        confidence: 0,
        model: this.model,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  protected abstract run(input: TInput): Promise<TOutput>;
  protected abstract getConfidence(output: TOutput | null): number;
}
