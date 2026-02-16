export interface LocalJudgeResult {
  findings: Array<{
    severity: string;
    category: string;
    title: string;
    description: string;
    evidence?: string;
    recommendation?: string;
  }>;
  score: number;
  summary: string;
  reasoning: string;
  explanation: string;
  risk_impact: string;
}

const SYSTEM_PROMPT = `You are a security analyst specializing in AI agent skill security. Your job is to analyze skill definitions and their associated files for security risks.

Analyze the content for the following categories of threats:

1. **Credential Theft** - Attempts to access API keys, SSH keys, AWS credentials, .env files, password stores
2. **Data Exfiltration** - Reading personal data (emails, messages, calendars) and sending to external servers
3. **Persistence** - Modifying shell profiles, creating cron jobs, LaunchAgents, or background processes
4. **Crypto Theft** - Accessing cryptocurrency wallets, seed phrases, private keys
5. **Network Attacks** - C2 communication, DDoS patterns, reverse proxies
6. **Obfuscation** - Hidden commands, silent execution, output suppression
7. **Dangerous Permissions** - Requesting excessive tool access (Bash + Read/Write combos)
8. **Supply Chain** - Package tampering, dependency injection, postinstall scripts
9. **Social Engineering** - Fake alerts, scareware, phishing attempts
10. **Privacy Violation** - Unauthorized data collection, fingerprinting, surveillance

For each issue found, provide:
- A severity level (critical, high, medium, low, info)
- A category from the list above
- A title (short identifier)
- A description (what the issue is)
- Evidence (the specific code/text that triggered the finding)
- A recommendation (how to fix or mitigate)

Respond in JSON format with this structure:
{
  "findings": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "Category Name",
      "title": "short-identifier",
      "description": "Description of the security issue",
      "evidence": "The specific code or text",
      "recommendation": "How to fix or mitigate"
    }
  ],
  "score": 0-100,
  "summary": "One sentence summary of the security assessment",
  "reasoning": "Your detailed reasoning for the score and findings",
  "explanation": "A plain English explanation of what this skill does — what it is, what tools it uses, and what it will do on the user's machine when installed. Write 2-4 sentences as if explaining to a non-technical user.",
  "risk_impact": "A plain English explanation of how the security risks you found would realistically affect the user. Be specific and concrete — what data could be stolen, what could be modified, what could go wrong. If the skill is safe, say so. Write 2-4 sentences as if advising a friend."
}

Scoring guide:
- 90-100: Safe, no security issues
- 75-89: Minor issues, low risk
- 60-74: Moderate issues, review needed
- 40-59: Significant issues, use with caution
- 0-39: Dangerous, do not install

Be thorough but avoid false positives. Legitimate security tools may have patterns that look suspicious but are appropriate for their purpose.`;

export async function runLocalLLMJudge(
  apiKey: string,
  content: string,
  skillName: string,
  model = 'gpt-4o-mini',
): Promise<LocalJudgeResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this skill for security issues:\n\nSkill Name: ${skillName}\n\n---\n${content}\n---\n\nProvide your security analysis in the JSON format specified.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = JSON.parse(data.choices[0].message.content) as LocalJudgeResult;

  // Validate
  if (!Array.isArray(raw.findings)) raw.findings = [];
  if (typeof raw.score !== 'number' || raw.score < 0 || raw.score > 100) raw.score = 50;
  raw.summary = raw.summary || 'Analysis complete';
  raw.reasoning = raw.reasoning || '';
  raw.explanation = raw.explanation || '';
  raw.risk_impact = raw.risk_impact || '';

  return raw;
}
