import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task, { ITask } from '@/models/Task';
import { verifyToken } from '@/lib/auth';
import { Types } from 'mongoose';

// GET: Obtener todas las tareas del usuario
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar el token y obtener el ID del usuario
    const userId = await verifyToken(token);

    // Conectar a la base de datos
    await connectDB();

    // Obtener todas las tareas del usuario
    const tasks = await Task.find({ userId })
      .sort({ dueDate: 1 })
      .lean();

    // Retornar las tareas
    return NextResponse.json({
      tasks: tasks.map(task => ({
        id: (task as unknown as { _id: Types.ObjectId })._id.toString(),
        title: (task as unknown as ITask).title,
        description: (task as unknown as ITask).description || '',
        dueDate: (task as unknown as ITask).dueDate,
        priority: (task as unknown as ITask).priority,
        status: (task as unknown as ITask).status,
        tags: (task as unknown as ITask).tags || []
      }))
    });

  } catch (error) {
    console.error('Error al obtener las tareas:', error);
    return NextResponse.json(
      { error: 'Error al obtener las tareas' },
      { status: 500 }
    );
  }
}

// POST: Crear una nueva tarea
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar el token y obtener el ID del usuario
    const userId = await verifyToken(token);

    // Conectar a la base de datos
    await connectDB();

    // Obtener los datos de la tarea del cuerpo de la petición
    const taskData = await request.json();

    // Crear la tarea con el ID del usuario
    const task = await Task.create({
      ...taskData,
      userId
    });

    // Retornar la tarea creada
    return NextResponse.json({
      id: task._id.toString(),
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      tags: task.tags || []
    });

  } catch (error) {
    console.error('Error al crear la tarea:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear la tarea' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar una tarea existente
export async function PUT(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar el token y obtener el ID del usuario
    const userId = await verifyToken(token);

    // Conectar a la base de datos
    await connectDB();

    // Obtener los datos de la tarea del cuerpo de la petición
    const { id, ...taskData } = await request.json();

    // Actualizar la tarea
    const task = await Task.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId },
      { $set: taskData },
      { new: true }
    );

    if (!task) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    // Retornar la tarea actualizada
    return NextResponse.json({
      id: task._id.toString(),
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      tags: task.tags || []
    });

  } catch (error) {
    console.error('Error al actualizar la tarea:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar la tarea' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una tarea
export async function DELETE(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar el token y obtener el ID del usuario
    const userId = await verifyToken(token);

    // Conectar a la base de datos
    await connectDB();

    // Obtener el ID de la tarea de la URL
    const { id } = await request.json();

    // Eliminar la tarea
    const task = await Task.findOneAndDelete({
      _id: new Types.ObjectId(id),
      userId
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Tarea eliminada correctamente' });

  } catch (error) {
    console.error('Error al eliminar la tarea:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al eliminar la tarea' },
      { status: 500 }
    );
  }
} 