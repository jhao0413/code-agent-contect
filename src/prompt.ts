import { createInterface, type Interface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Readable } from 'node:stream';

async function readAllLines(stream: NodeJS.ReadableStream): Promise<string[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString('utf8').split('\n');
}

export class Prompt {
  private rl: Interface | null = null;
  private bufferedLines: string[] | null = null;
  private lineIndex = 0;
  private isTTY: boolean;

  constructor() {
    this.isTTY = Boolean(stdin.isTTY);
    if (this.isTTY) {
      this.rl = createInterface({ input: stdin, output: stdout });
    }
  }

  async init(): Promise<void> {
    if (!this.isTTY) {
      this.bufferedLines = await readAllLines(stdin);
    }
  }

  private nextLine(): string {
    if (this.bufferedLines && this.lineIndex < this.bufferedLines.length) {
      return this.bufferedLines[this.lineIndex++];
    }
    return '';
  }

  async ask(q: string, defaultValue?: string): Promise<string> {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    const prompt = `${q}${suffix}: `;

    if (this.rl) {
      try {
        const answer = (await this.rl.question(prompt)).trim();
        return answer || defaultValue || '';
      } catch {
        return defaultValue || '';
      }
    }

    stdout.write(prompt);
    const answer = this.nextLine().trim();
    stdout.write(`${answer}\n`);
    return answer || defaultValue || '';
  }

  async confirm(q: string, defaultYes = true): Promise<boolean> {
    const hint = defaultYes ? 'Y/n' : 'y/N';
    const prompt = `${q} (${hint}): `;

    if (this.rl) {
      try {
        const answer = (await this.rl.question(prompt)).trim().toLowerCase();
        if (!answer) return defaultYes;
        return answer.startsWith('y');
      } catch {
        return defaultYes;
      }
    }

    stdout.write(prompt);
    const answer = this.nextLine().trim().toLowerCase();
    stdout.write(`${answer}\n`);
    if (!answer) return defaultYes;
    return answer.startsWith('y');
  }

  close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}
