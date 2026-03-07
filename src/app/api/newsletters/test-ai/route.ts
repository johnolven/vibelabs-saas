import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await verifyToken(token);

    const { aiProvider, aiModel, aiApiKey } = await req.json();

    if (!aiProvider || !aiApiKey) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    if (aiProvider === 'openai') {
      const openai = new OpenAI({ apiKey: aiApiKey });
      const response = await openai.chat.completions.create({
        model: aiModel || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Respond with only: OK' }],
        max_tokens: 5,
      });
      if (response.choices[0]?.message?.content) {
        return NextResponse.json({ success: true, message: 'Conexion exitosa con OpenAI' });
      }
    } else if (aiProvider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey: aiApiKey });
      const response = await anthropic.messages.create({
        model: aiModel || 'claude-haiku-4-5-20251001',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Respond with only: OK' }],
      });
      if (response.content.length > 0) {
        return NextResponse.json({ success: true, message: 'Conexion exitosa con Anthropic' });
      }
    } else {
      return NextResponse.json({ error: 'Provider no soportado' }, { status: 400 });
    }

    return NextResponse.json({ error: 'No se pudo verificar la conexion' }, { status: 500 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    // Detect common API key errors
    if (message.includes('401') || message.includes('invalid') || message.includes('Incorrect API key')) {
      return NextResponse.json({ error: 'API key invalida. Verifica que la key sea correcta.' }, { status: 400 });
    }
    if (message.includes('insufficient_quota') || message.includes('rate_limit')) {
      return NextResponse.json({ error: 'La API key no tiene creditos o excedio el limite. Verifica tu plan.' }, { status: 400 });
    }
    return NextResponse.json({ error: `Error al conectar: ${message}` }, { status: 500 });
  }
}
