import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Role from '@/models/Role';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { Permission } from '@/lib/permissions';

// GET - Obtener todos los roles
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
    
    // Obtener todos los roles
    const roles = await Role.find({}).sort({ createdAt: -1 });
    
    // Contar usuarios por rol
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const usersCount = await User.countDocuments({ role: role.name });
        return {
          id: role._id.toString(),
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystemRole: role.isSystemRole,
          createdAt: role.createdAt.toISOString(),
          updatedAt: role.updatedAt.toISOString(),
          usersCount
        };
      })
    );
    
    return NextResponse.json(rolesWithCounts);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    return NextResponse.json(
      { error: 'Error al obtener roles' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo rol
export async function POST(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const adminId = await verifyToken(token);
    const data = await req.json();
    await connectDB();
    
    // Verificar si el usuario es administrador o founder
    const adminUser = await User.findById(adminId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'founder')) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de administrador' },
        { status: 403 }
      );
    }
    
    // Validar datos
    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: 'El nombre del rol es requerido' },
        { status: 400 }
      );
    }
    
    // Verificar si el rol ya existe
    const existingRole = await Role.findOne({ name: data.name });
    if (existingRole) {
      return NextResponse.json(
        { error: 'Ya existe un rol con ese nombre' },
        { status: 400 }
      );
    }
    
    // Validar permisos
    const validPermissions: Permission[] = [
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
    ];
    
    const permissions = (data.permissions || []).filter((p: string) => 
      validPermissions.includes(p as Permission)
    );
    
    // Crear el nuevo rol
    const newRole = await Role.create({
      name: data.name,
      description: data.description || '',
      permissions,
      isSystemRole: false,
      createdBy: adminId
    });
    
    const usersCount = await User.countDocuments({ role: newRole.name });
    
    return NextResponse.json({
      id: newRole._id.toString(),
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions,
      isSystemRole: newRole.isSystemRole,
      createdAt: newRole.createdAt.toISOString(),
      updatedAt: newRole.updatedAt.toISOString(),
      usersCount
    }, { status: 201 });
  } catch (error) {
    console.error('Error al crear rol:', error);
    return NextResponse.json(
      { error: 'Error al crear rol' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar rol
export async function PUT(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const adminId = await verifyToken(token);
    const data = await req.json();
    await connectDB();
    
    // Verificar si el usuario es administrador o founder
    const adminUser = await User.findById(adminId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'founder')) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de administrador' },
        { status: 403 }
      );
    }
    
    // Validar datos
    if (!data.id || !data.name?.trim()) {
      return NextResponse.json(
        { error: 'ID y nombre del rol son requeridos' },
        { status: 400 }
      );
    }
    
    const role = await Role.findById(data.id);
    if (!role) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }
    
    // No permitir modificar roles del sistema (excepto permisos)
    if (role.isSystemRole && data.name !== role.name) {
      return NextResponse.json(
        { error: 'No se puede modificar el nombre de un rol del sistema' },
        { status: 400 }
      );
    }
    
    // Validar permisos
    const validPermissions: Permission[] = [
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
    ];
    
    const permissions = (data.permissions || []).filter((p: string) => 
      validPermissions.includes(p as Permission)
    );
    
    // Actualizar rol
    role.name = data.name;
    role.description = data.description || '';
    role.permissions = permissions;
    await role.save();
    
    const usersCount = await User.countDocuments({ role: role.name });
    
    return NextResponse.json({
      id: role._id.toString(),
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
      usersCount
    });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    return NextResponse.json(
      { error: 'Error al actualizar rol' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar rol
export async function DELETE(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    const url = new URL(req.url);
    const roleId = url.searchParams.get('id');
    
    if (!roleId) {
      return NextResponse.json(
        { error: 'Se requiere ID de rol' },
        { status: 400 }
      );
    }

    const adminId = await verifyToken(token);
    await connectDB();
    
    // Verificar si el usuario es administrador o founder
    const adminUser = await User.findById(adminId);
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'founder')) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requieren permisos de administrador' },
        { status: 403 }
      );
    }
    
    const role = await Role.findById(roleId);
    if (!role) {
      return NextResponse.json(
        { error: 'Rol no encontrado' },
        { status: 404 }
      );
    }
    
    // No permitir eliminar roles del sistema
    if (role.isSystemRole) {
      return NextResponse.json(
        { error: 'No se puede eliminar un rol del sistema' },
        { status: 400 }
      );
    }
    
    // Verificar si hay usuarios con este rol
    const usersCount = await User.countDocuments({ role: role.name });
    if (usersCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar. Este rol está asignado a ${usersCount} usuarios` },
        { status: 400 }
      );
    }
    
    await Role.findByIdAndDelete(roleId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Rol eliminado correctamente' 
    });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    return NextResponse.json(
      { error: 'Error al eliminar rol' },
      { status: 500 }
    );
  }
}

