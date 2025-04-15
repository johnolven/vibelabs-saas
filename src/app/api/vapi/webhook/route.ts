import { NextResponse } from 'next/server';
import { VapiServerService } from '@/services/vapiServerService';

// Crear una instancia singleton del servicio
const vapiServerService = new VapiServerService(process.env.NEXT_PUBLIC_VAPI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    console.log('Webhook raw body:', rawBody);

    let message;
    try {
      message = JSON.parse(rawBody);
      console.log('Webhook parsed message:', message);
    } catch (parseError) {
      console.error('Error parsing webhook body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    // Validar que el mensaje tiene un tipo válido
    if (!message || typeof message !== 'object') {
      console.error('Invalid message format - not an object:', message);
      return NextResponse.json(
        { error: 'Invalid message format - not an object' },
        { status: 400 }
      );
    }

    if (!message.type || typeof message.type !== 'string') {
      console.error('Invalid message format - missing or invalid type:', message);
      return NextResponse.json(
        { error: 'Invalid message format - missing or invalid type' },
        { status: 400 }
      );
    }

    // Validar el tipo de mensaje
    const validTypes = ['transcript', 'transcript[transcriptType="final"]', 'conversation-update'];
    if (!validTypes.includes(message.type)) {
      console.error('Invalid message type:', message.type);
      return NextResponse.json(
        { error: `Invalid message type: ${message.type}` },
        { status: 400 }
      );
    }

    // Procesar el webhook
    vapiServerService.handleWebhook(message);
    console.log('Webhook processed successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
} 