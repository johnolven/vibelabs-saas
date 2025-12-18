import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { Permission } from '@/lib/permissions';

// GET - Obtener todos los permisos disponibles
export async function GET(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = await verifyToken(token);
    await connectDB();
    
    // Verificar si el usuario es administrador o founder
    const adminUser = await User.findById(userId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'founder')) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de administrador' },
        { status: 403 }
      );
    }
    
    // Definir todos los permisos disponibles con sus descripciones y módulos
    const permissions = [
      {
        id: 'read_cap_table',
        name: 'read_cap_table',
        description: 'Ver tabla de capitalización',
        module: 'Cap Table'
      },
      {
        id: 'write_cap_table',
        name: 'write_cap_table',
        description: 'Editar tabla de capitalización',
        module: 'Cap Table'
      },
      {
        id: 'read_documents',
        name: 'read_documents',
        description: 'Ver documentos del Data Room',
        module: 'Data Room'
      },
      {
        id: 'write_documents',
        name: 'write_documents',
        description: 'Subir y gestionar documentos',
        module: 'Data Room'
      },
      {
        id: 'read_updates',
        name: 'read_updates',
        description: 'Ver monthly updates',
        module: 'Updates'
      },
      {
        id: 'write_updates',
        name: 'write_updates',
        description: 'Crear y editar monthly updates',
        module: 'Updates'
      },
      {
        id: 'read_metrics',
        name: 'read_metrics',
        description: 'Ver métricas',
        module: 'Métricas'
      },
      {
        id: 'write_metrics',
        name: 'write_metrics',
        description: 'Gestionar métricas',
        module: 'Métricas'
      },
      {
        id: 'comment',
        name: 'comment',
        description: 'Comentar en updates y documentos',
        module: 'Comentarios'
      },
      {
        id: 'manage_users',
        name: 'manage_users',
        description: 'Gestionar usuarios y roles',
        module: 'Administración'
      },
      {
        id: 'send_updates',
        name: 'send_updates',
        description: 'Enviar updates por email',
        module: 'Updates'
      }
    ];
    
    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    return NextResponse.json(
      { error: 'Error al obtener permisos' },
      { status: 500 }
    );
  }
}

