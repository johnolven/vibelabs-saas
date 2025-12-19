import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Role from '@/models/Role';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

// POST - Inicializar roles del sistema
export async function POST(req: Request) {
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

    // Definir roles del sistema con sus permisos
    const systemRoles = [
      {
        name: 'founder',
        description: 'Fundador con acceso completo a todas las funciones',
        permissions: [
          'read_cap_table',
          'write_cap_table',
          'read_documents',
          'write_documents',
          'read_updates',
          'write_updates',
          'read_metrics',
          'write_metrics',
          'comment',
          'manage_users',
          'send_updates'
        ],
        isSystemRole: true
      },
      {
        name: 'admin',
        description: 'Administrador con acceso completo a todas las funciones',
        permissions: [
          'read_cap_table',
          'write_cap_table',
          'read_documents',
          'write_documents',
          'read_updates',
          'write_updates',
          'read_metrics',
          'write_metrics',
          'comment',
          'manage_users',
          'send_updates'
        ],
        isSystemRole: true
      },
      {
        name: 'investor',
        description: 'Inversor con acceso de lectura a información de inversión',
        permissions: [
          'read_cap_table',
          'read_documents',
          'read_updates',
          'read_metrics',
          'comment'
        ],
        isSystemRole: true
      },
      {
        name: 'boardmember',
        description: 'Miembro del board con acceso a información estratégica',
        permissions: [
          'read_cap_table',
          'read_documents',
          'read_updates',
          'read_metrics',
          'comment'
        ],
        isSystemRole: true
      },
      {
        name: 'potential_investor',
        description: 'Inversor potencial con acceso limitado',
        permissions: [
          'read_documents',
          'read_updates'
        ],
        isSystemRole: true
      },
      {
        name: 'follower',
        description: 'Seguidor con acceso solo a product updates',
        permissions: [
          'read_updates'
        ],
        isSystemRole: true
      }
    ];

    const createdRoles = [];
    const existingRoles = [];

    // Crear o actualizar cada rol del sistema
    for (const roleData of systemRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (existingRole) {
        // Actualizar rol existente con permisos correctos
        existingRole.description = roleData.description;
        existingRole.permissions = roleData.permissions;
        existingRole.isSystemRole = true;
        await existingRole.save();
        existingRoles.push(existingRole.name);
      } else {
        // Crear nuevo rol
        const newRole = await Role.create({
          ...roleData,
          createdBy: userId
        });
        createdRoles.push(newRole.name);
      }
    }

    // Contar usuarios por rol
    const rolesWithCounts = await Promise.all(
      systemRoles.map(async (roleData) => {
        const role = await Role.findOne({ name: roleData.name });
        const usersCount = await User.countDocuments({ role: roleData.name });
        return {
          id: role?._id.toString(),
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
          isSystemRole: true,
          usersCount
        };
      })
    );

    return NextResponse.json({
      success: true,
      message: `Roles inicializados: ${createdRoles.length} creados, ${existingRoles.length} actualizados`,
      created: createdRoles,
      updated: existingRoles,
      roles: rolesWithCounts
    });
  } catch (error) {
    console.error('Error al inicializar roles:', error);
    return NextResponse.json(
      { error: 'Error al inicializar roles' },
      { status: 500 }
    );
  }
}


