import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware para verificar autenticación
async function verifyToken(request: Request) {
  try {
    // Obtener el token del header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { verified: false, error: 'Token no proporcionado' };
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Conectar a la base de datos
    await connectDB();
    
    // Buscar el usuario
    const user = await User.findById(decoded.userId);
    if (!user) {
      return { verified: false, error: 'Usuario no encontrado' };
    }
    
    // Retornar el id del usuario
    return { verified: true, userId: decoded.userId, user };
  } catch (error) {
    console.error('Error verificando token:', error);
    return { verified: false, error: 'Token inválido' };
  }
}

// GET: Obtener todos los usuarios
export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const auth = await verifyToken(request);
    if (!auth.verified) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    
    // Conectar a la base de datos
    await connectDB();
    
    // Obtener todos los usuarios directamente
    const users = await User.find().select('-password').lean();
    
    console.log('==== DEPURACIÓN DE ROLES ====');
    // Verificar los datos crudos antes de transformarlos
    for (const user of users) {
      console.log(`Usuario ID: ${user._id}, Nombre: ${user.name}`);
      console.log(`  Role DIRECTO: "${user.role}"`);
      console.log(`  Tipo de Role: ${typeof user.role}`);
      console.log(`  Role como string: "${String(user.role)}"`);
      console.log(`  Role por defecto: "${user.role || 'user'}"`);
      console.log('-------------------');
    }
    
    // Transformar datos con acceso seguro a los roles
    const formattedUsers = users.map(user => {
      // Intentar diferentes formas de acceder al rol
      let role = 'user'; // Por defecto
      
      if (user.role !== undefined && user.role !== null) {
        if (typeof user.role === 'string') {
          role = user.role;
        } else if (user.role?.toString) {
          role = user.role.toString();
        }
      }
      
      console.log(`Usuario ${user.name}: rol FINAL = "${role}"`);
      
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        status: user.status || 'active'
      };
    });
    
    // Verificar datos finales
    console.log('DATOS FINALES:', JSON.stringify(formattedUsers));
    
    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo usuario
export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const auth = await verifyToken(request);
    if (!auth.verified) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    
    // Obtener datos del request
    const userData = await request.json();
    
    // Validaciones básicas
    if (!userData.name || !userData.email || !userData.password) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    // Conectar a la base de datos
    await connectDB();
    
    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }
    
    // Crear el nuevo usuario
    const newUser = new User({
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'user',
      status: userData.status || 'active'
    });
    
    // Guardar el usuario
    await newUser.save();
    
    // Formatear la respuesta para excluir el password
    const createdUser = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role || 'user',
      status: newUser.status || 'active',
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };
    
    return NextResponse.json(createdUser, { status: 201 });
  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en el servidor' },
      { status: 500 }
    );
  }
} 