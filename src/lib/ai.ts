import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { decrypt } from './crypto';
import { INewsletter } from '@/models/Newsletter';

interface NewsletterContent {
  subject: string;
  sections: { title: string; content: string }[];
}

const SYSTEM_PROMPT = `You are an expert newsletter editor. Generate a newsletter issue with compelling, valuable content.
Respond ONLY with valid JSON in this exact format:
{
  "subject": "An engaging email subject line",
  "sections": [
    { "title": "Section Title", "content": "Section content with useful information. Can include multiple paragraphs separated by \\n\\n." },
    { "title": "Section Title 2", "content": "More content here." }
  ]
}
Generate 3-5 sections. Make the content genuinely informative and valuable. Do NOT use markdown in content, use plain text only.`;

function buildUserPrompt(newsletter: INewsletter): string {
  return `Generate today's newsletter issue.
Newsletter name: ${newsletter.name}
Topic/Focus: ${newsletter.topic}
Style: ${newsletter.style}
Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Write in a ${newsletter.style} tone. Make it engaging and valuable for subscribers interested in: ${newsletter.topic}.`;
}

export async function generateNewsletterContent(newsletter: INewsletter): Promise<NewsletterContent> {
  const apiKey = decrypt(newsletter.aiApiKey);
  const userPrompt = buildUserPrompt(newsletter);

  let rawContent: string | null = null;

  if (newsletter.aiProvider === 'openai') {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: newsletter.aiModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    });
    rawContent = response.choices[0]?.message?.content ?? null;

  } else if (newsletter.aiProvider === 'anthropic') {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: newsletter.aiModel || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const block = response.content[0];
    rawContent = block.type === 'text' ? block.text : null;
  }

  if (!rawContent) {
    throw new Error('No se recibio contenido del modelo de IA');
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = rawContent.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr) as NewsletterContent;

  if (!parsed.subject || !Array.isArray(parsed.sections) || parsed.sections.length === 0) {
    throw new Error('El contenido generado no tiene el formato esperado');
  }

  return parsed;
}
