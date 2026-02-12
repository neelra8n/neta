export interface LLMConfig {
  provider: 'local' | 'openai' | 'anthropic' | 'gemini';
  model: string;
  apiKey?: string;
}

import chalk from 'chalk';

export abstract class LLMClient {
  abstract generate(prompt: string): Promise<string>;
}

export class LocalClient extends LLMClient {
  constructor(private config: LLMConfig) {
    super();
  }

  async generate(prompt: string): Promise<string> {
    const ollamaUrl = 'http://127.0.0.1:11434/api/generate';
    console.log(chalk.blue(`Requesting generation from Ollama (${this.config.model})...`));

    try {
      const response = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model, // e.g., 'llama3'
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama Error: ${response.statusText}`);
      }

      const data = (await response.json()) as { response: string };
      return data.response;
    } catch (error) {
      console.warn(chalk.yellow('Failed to connect to Local LLM (Ollama). Falling back to stub.'));
      console.warn(chalk.dim(`Error: ${(error as Error).message}`));
      console.warn(chalk.dim('Make sure Ollama is running: `ollama serve`'));

      return `
/*
[NETA] Local LLM Connection Failed.
Generated test content stub for prompt:
${prompt.replace(/\*\//g, '* /')}
*/
// TODO: Implement test manually or ensure Ollama is running.
`;
    }
  }
}

export class CloudClient extends LLMClient {
  constructor(private config: LLMConfig) {
    super();
  }

  async generate(prompt: string): Promise<string> {
    console.log(chalk.blue(`Requesting generation from ${this.config.provider} (${this.config.model})...`));

    try {
      if (this.config.provider === 'openai') {
        return await this.callOpenAI(prompt);
      } else if (this.config.provider === 'anthropic') {
        return await this.callAnthropic(prompt);
      } else if (this.config.provider === 'gemini') {
        return await this.callGemini(prompt);
      }
      throw new Error(`Unsupported provider: ${this.config.provider}`);
    } catch (error) {
      console.error(chalk.red('Cloud LLM API call failed:'), (error as Error).message);
      throw error;
    }
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { content: Array<{ text: string }> };
    return data.content[0].text;
  }

  private async callGemini(prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
    return data.candidates[0].content.parts[0].text;
  }
}

export function createLLMClient(config: LLMConfig): LLMClient {
  if (config.provider === 'local') {
    return new LocalClient(config);
  }
  // CloudClient handles openai, anthropic, and gemini (mocked for now)
  return new CloudClient(config);
}
