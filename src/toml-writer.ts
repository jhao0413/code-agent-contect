export function tomlString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
}

export function tomlStringArray(arr: string[]): string {
  return `[${arr.map(tomlString).join(', ')}]`;
}

export interface ConfigData {
  botToken: string;
  allowedUserIds: string[];
  defaultAgent: string;
  workingDir: string;
  enabledAgents: string[];
  agentBins: Record<string, string>;
}

export function generateConfigToml(data: ConfigData): string {
  const lines: string[] = [
    '[telegram]',
    `bot_token = ${tomlString(data.botToken)}`,
    `allowed_user_ids = ${tomlStringArray(data.allowedUserIds)}`,
    '',
    '[bridge]',
    `default_agent = ${tomlString(data.defaultAgent)}`,
    `working_dir = ${tomlString(data.workingDir)}`,
    '',
    '[agents]',
    `enabled = ${tomlStringArray(data.enabledAgents)}`,
  ];

  for (const agent of data.enabledAgents) {
    lines.push('', `[agents.${agent}]`);
    const bin = data.agentBins[agent];
    if (bin) {
      lines.push(`bin = ${tomlString(bin)}`);
    }
    lines.push('model = ""');
  }

  lines.push('');
  return lines.join('\n');
}
