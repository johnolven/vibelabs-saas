import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Función para verificar autenticación
async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return { verified: true, userId: decoded.userId };
  } catch {
    return { verified: false, error: 'Token inválido' };
  }
}

// Función para manejar la solicitud GET de un usuario por su ID
export async function GET(request: NextRequest) {
  // Obtener el ID del usuario desde la URL
  const idParam = request.nextUrl.pathname.split('/').pop() || '';
  
  // Verificar autenticación
  const token = request.headers.get("authorization")?.split(" ")[1] || "";
  const auth = await verifyToken(token);

  if (!auth.verified) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    // Conectar a la base de datos
    await connectDB();
    const userId = idParam;

    // Buscar usuario por ID
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}

// Función para manejar la solicitud PUT de actualización de un usuario
export async function PUT(request: NextRequest) {
  // Obtener el ID del usuario desde la URL
  const idParam = request.nextUrl.pathname.split('/').pop() || '';
  
  // Verificar autenticación
  const token = request.headers.get("authorization")?.split(" ")[1] || "";
  const auth = await verifyToken(token);

  if (!auth.verified) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    // Conectar a la base de datos
    await connectDB();
    const userId = idParam;
    const data = await request.json();

    console.log(`API - Solicitud de actualización recibida para usuario ID: ${userId}`);
    console.log(`API - Datos de la solicitud:`, JSON.stringify(data));

    // Validar datos
    if (!data.name || !data.email) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (nombre o email)" },
        { status: 400 }
      );
    }

    // Preparar datos para actualización
    const updateData = {
      name: data.name,
      email: data.email,
      role: data.role ? data.role.toLowerCase() : 'user',
      status: data.status || 'active',
      updatedAt: new Date()
    };

    console.log(`API - Datos preparados para actualización:`, JSON.stringify(updateData));

    // Buscar el usuario antes de actualizarlo para verificar sus datos actuales
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    console.log(`API - Usuario actual:`, JSON.stringify({
      id: existingUser._id,
      name: existingUser.name,
      role: existingUser.role,
      status: existingUser.status
    }));

    // Actualizar el usuario utilizando findByIdAndUpdate y pasando el objeto updateData completo
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },  // Usar $set para asegurarse de que todos los campos se actualicen
      { 
        new: true,           // Retornar el documento actualizado
        runValidators: true  // Ejecutar validadores del esquema
      }
    ).select('-password');

    if (!updatedUser) {
      console.error(`API - Error: No se pudo actualizar el usuario ${userId}`);
      return NextResponse.json(
        { error: "Error al actualizar usuario" },
        { status: 500 }
      );
    }

    // Verificar que el rol se haya actualizado correctamente
    console.log(`API - Usuario actualizado:`, JSON.stringify({
      id: updatedUser._id,
      name: updatedUser.name,
      role: updatedUser.role,
      status: updatedUser.status
    }));

    // Convertir el documento Mongoose a un objeto plano para evitar problemas de serialización
    const userObject = updatedUser.toObject();
    console.log(`API - Objeto final a devolver:`, JSON.stringify(userObject));

    return NextResponse.json(userObject);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// Función para manejar la solicitud DELETE de eliminación de un usuario
export async function DELETE(request: NextRequest) {
  // Obtener el ID del usuario desde la URL
  const idParam = request.nextUrl.pathname.split('/').pop() || '';
  
  // Verificar autenticación
  const token = request.headers.get("authorization")?.split(" ")[1] || "";
  const auth = await verifyToken(token);

  if (!auth.verified) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  try {
    // Conectar a la base de datos
    await connectDB();
    const userId = idParam;

    // Eliminar el usuario
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
} 