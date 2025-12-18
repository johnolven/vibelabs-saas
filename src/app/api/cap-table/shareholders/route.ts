import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CapTable from '@/models/CapTable';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// POST: Agregar un nuevo shareholder
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = await verifyToken(token);
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!hasPermission(user.role, 'write_cap_table')) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar el cap table' },
        { status: 403 }
      );
    }

    const data = await request.json();
    
    console.log('Datos recibidos en POST:', JSON.stringify(data, null, 2));
    console.log('Vesting data recibida:', {
      vestingStartDate: data.vestingStartDate,
      vestingCliffMonths: data.vestingCliffMonths,
      vestingPeriodMonths: data.vestingPeriodMonths,
      vestingSchedule: data.vestingSchedule
    });
    
    // Validar datos del shareholder
    if (!data.name || !data.type || !data.equityType || data.shares === undefined) {
      return NextResponse.json(
        { error: 'Nombre, tipo, tipo de equity y shares son requeridos' },
        { status: 400 }
      );
    }

    // Obtener o crear cap table
    let capTable = await CapTable.findOne().sort({ createdAt: -1 });
    
    if (!capTable) {
      return NextResponse.json(
        { error: 'Primero debes crear el cap table con nombre de empresa y total de shares' },
        { status: 400 }
      );
    }

    const newShares = Number(data.shares);
    const currentOutstanding = capTable.shareholders.reduce((sum, sh) => sum + (sh.shares || 0), 0);
    let reservedPool = capTable.reservedPool || 0;
    const totalShares = capTable.totalShares || 0;
    
    // Verificar si es una transferencia de acciones existentes o emisión de nuevas
    const isTransfer = data.transferFromShareholderId !== undefined && data.transferFromShareholderId !== null;
    const isFromReservedPool = data.fromReservedPool === true && data.type === 'employee';
    
    if (isFromReservedPool) {
      // ASIGNACIÓN DESDE RESERVED POOL: Empleado recibe acciones del reserved pool
      if (reservedPool < newShares) {
        return NextResponse.json(
          { 
            error: `El reserved pool solo tiene ${reservedPool.toLocaleString()} shares disponibles, no puedes asignar ${newShares.toLocaleString()} a este empleado`,
            suggestion: {
              currentReservedPool: reservedPool,
              requestedShares: newShares,
              availableInReserved: reservedPool
            }
          },
          { status: 400 }
        );
      }
      
      // Reducir el reserved pool
      capTable.reservedPool = reservedPool - newShares;
      
      // El total outstanding aumenta (las acciones salen del reserved pool y se asignan)
      // No necesita validación adicional porque ya estaban reservadas
    } else if (isTransfer) {
      // TRANSFERENCIA: Se transfieren acciones de un shareholder existente
      const sourceShareholder = capTable.shareholders.id(data.transferFromShareholderId);
      if (!sourceShareholder) {
        return NextResponse.json(
          { error: 'Shareholder origen no encontrado para la transferencia' },
          { status: 400 }
        );
      }
      
      if (sourceShareholder.shares < newShares) {
        return NextResponse.json(
          { error: `El shareholder origen solo tiene ${sourceShareholder.shares.toLocaleString()} shares, no puede transferir ${newShares.toLocaleString()}` },
          { status: 400 }
        );
      }
      
      // Reducir shares del shareholder origen
      sourceShareholder.shares = sourceShareholder.shares - newShares;
      
      // El total outstanding NO cambia (solo se transfieren)
      // No necesita validación de espacio porque no se emiten nuevas acciones
    } else {
      // EMISIÓN: Se emiten nuevas acciones (aumenta outstanding)
      const newTotalOutstanding = currentOutstanding + newShares;
      
      // Validar que las nuevas shares no excedan el espacio disponible
      // Espacio disponible = Total Autorizado - Reserved Pool
      const availableSpace = totalShares - reservedPool;
      
      if (newTotalOutstanding > availableSpace) {
        const neededTotalShares = newTotalOutstanding + reservedPool;
        return NextResponse.json(
          { 
            error: `No hay suficiente espacio. Las nuevas shares (${newShares.toLocaleString()}) harían que el total asignado (${newTotalOutstanding.toLocaleString()}) exceda el espacio disponible (${availableSpace.toLocaleString()}). Necesitas aumentar el total autorizado a ${neededTotalShares.toLocaleString()} o reducir el reserved pool.`,
            suggestion: {
              currentTotal: totalShares,
              neededTotal: neededTotalShares,
              currentOutstanding: currentOutstanding,
              newShares: newShares,
              reservedPool: reservedPool
            }
          },
          { status: 400 }
        );
      }
    }

    // Crear nuevo shareholder
    const newShareholder = {
      userId: data.userId || undefined,
      name: data.name,
      email: data.email || undefined,
      type: data.type,
      equityType: data.equityType,
      shares: newShares,
      ownershipPercentage: 0, // Se calculará automáticamente
      investmentAmount: data.investmentAmount ? Number(data.investmentAmount) : undefined,
      investmentDate: data.investmentDate ? new Date(data.investmentDate) : undefined,
      fullyDiluted: data.fullyDiluted || false,
      notes: data.notes || undefined,
      // Vesting fields (solo incluir si están presentes)
      ...(data.vestingStartDate ? { vestingStartDate: new Date(data.vestingStartDate) } : {}),
      ...(data.vestingCliffMonths !== undefined && data.vestingCliffMonths !== null ? { vestingCliffMonths: Number(data.vestingCliffMonths) } : {}),
      ...(data.vestingPeriodMonths !== undefined && data.vestingPeriodMonths !== null ? { vestingPeriodMonths: Number(data.vestingPeriodMonths) } : {}),
      ...(data.vestingSchedule ? { vestingSchedule: data.vestingSchedule } : {})
    };

    console.log('Nuevo shareholder a crear:', JSON.stringify(newShareholder, null, 2));
    console.log('Vesting en newShareholder:', {
      vestingStartDate: newShareholder.vestingStartDate,
      vestingCliffMonths: newShareholder.vestingCliffMonths,
      vestingPeriodMonths: newShareholder.vestingPeriodMonths,
      vestingSchedule: newShareholder.vestingSchedule
    });

    capTable.shareholders.push(newShareholder);
    await capTable.save();
    
    // Verificar que se guardó correctamente
    const savedShareholder = capTable.shareholders[capTable.shareholders.length - 1];
    console.log('Shareholder guardado. Verificando vesting guardado:', {
      vestingStartDate: savedShareholder.vestingStartDate,
      vestingCliffMonths: savedShareholder.vestingCliffMonths,
      vestingPeriodMonths: savedShareholder.vestingPeriodMonths,
      vestingSchedule: savedShareholder.vestingSchedule
    });

    // Recargar el documento para obtener los virtuals calculados
    const updatedCapTable = await CapTable.findById(capTable._id);
    if (!updatedCapTable) {
      return NextResponse.json(
        { error: 'Error al recargar el cap table' },
        { status: 500 }
      );
    }

    // Asegurar que los shareholders tengan sus _id incluidos y virtuals calculados
    const capTableData = updatedCapTable.toObject({ virtuals: true });
    if (capTableData.shareholders) {
      capTableData.shareholders = capTableData.shareholders.map((sh: any) => ({
        ...sh,
        _id: sh._id?.toString() || sh._id,
        // Asegurar que los virtuals estén incluidos
        vestedShares: sh.vestedShares || 0,
        unvestedShares: sh.unvestedShares || 0
      }));
    }

    return NextResponse.json(capTableData, { status: 200 });
  } catch (error) {
    console.error('Error al agregar shareholder:', error);
    return NextResponse.json(
      { error: 'Error al agregar shareholder' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un shareholder existente
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = await verifyToken(token);
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!hasPermission(user.role, 'write_cap_table')) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar el cap table' },
        { status: 403 }
      );
    }

    const data = await request.json();
    
    if (!data.shareholderId) {
      return NextResponse.json(
        { error: 'ID del shareholder es requerido' },
        { status: 400 }
      );
    }

    const capTable = await CapTable.findOne().sort({ createdAt: -1 });
    
    if (!capTable) {
      return NextResponse.json(
        { error: 'Cap table no encontrado' },
        { status: 404 }
      );
    }

    const shareholder = capTable.shareholders.id(data.shareholderId);
    if (!shareholder) {
      return NextResponse.json(
        { error: 'Shareholder no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar campos
    if (data.name) shareholder.name = data.name;
    if (data.email !== undefined) shareholder.email = data.email;
    if (data.type) shareholder.type = data.type;
    if (data.equityType) shareholder.equityType = data.equityType;
    if (data.shares !== undefined) shareholder.shares = Number(data.shares);
    if (data.investmentAmount !== undefined) shareholder.investmentAmount = data.investmentAmount ? Number(data.investmentAmount) : undefined;
    if (data.investmentDate !== undefined) shareholder.investmentDate = data.investmentDate ? new Date(data.investmentDate) : undefined;
    if (data.fullyDiluted !== undefined) shareholder.fullyDiluted = data.fullyDiluted;
    if (data.notes !== undefined) shareholder.notes = data.notes;
    if (data.userId !== undefined) shareholder.userId = data.userId || undefined;
    // Vesting fields
    if (data.vestingStartDate !== undefined) {
      shareholder.vestingStartDate = data.vestingStartDate ? new Date(data.vestingStartDate) : undefined;
    }
    if (data.vestingCliffMonths !== undefined) {
      shareholder.vestingCliffMonths = (data.vestingCliffMonths !== null && data.vestingCliffMonths !== undefined) ? Number(data.vestingCliffMonths) : undefined;
    }
    if (data.vestingPeriodMonths !== undefined) {
      shareholder.vestingPeriodMonths = (data.vestingPeriodMonths !== null && data.vestingPeriodMonths !== undefined) ? Number(data.vestingPeriodMonths) : undefined;
    }
    if (data.vestingSchedule !== undefined) {
      shareholder.vestingSchedule = data.vestingSchedule || undefined;
    }

    await capTable.save();

    // Recargar el documento para obtener los virtuals calculados
    const updatedCapTable = await CapTable.findById(capTable._id);
    if (!updatedCapTable) {
      return NextResponse.json(
        { error: 'Error al recargar el cap table' },
        { status: 500 }
      );
    }

    // Asegurar que los shareholders tengan sus _id incluidos y virtuals calculados
    const capTableData = updatedCapTable.toObject({ virtuals: true });
    if (capTableData.shareholders) {
      capTableData.shareholders = capTableData.shareholders.map((sh: any) => ({
        ...sh,
        _id: sh._id?.toString() || sh._id,
        // Asegurar que los virtuals estén incluidos
        vestedShares: sh.vestedShares || 0,
        unvestedShares: sh.unvestedShares || 0
      }));
    }

    return NextResponse.json(capTableData, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar shareholder:', error);
    return NextResponse.json(
      { error: 'Error al actualizar shareholder' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un shareholder
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = await verifyToken(token);
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!hasPermission(user.role, 'write_cap_table')) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar el cap table' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shareholderId = searchParams.get('id');
    
    if (!shareholderId) {
      return NextResponse.json(
        { error: 'ID del shareholder es requerido' },
        { status: 400 }
      );
    }

    // Obtener datos del body si están disponibles
    let deleteData: any = {};
    try {
      const body = await request.json().catch(() => ({}));
      deleteData = body;
    } catch (e) {
      // Si no hay body, usar valores por defecto
    }

    const capTable = await CapTable.findOne().sort({ createdAt: -1 });
    
    if (!capTable) {
      return NextResponse.json(
        { error: 'Cap table no encontrado' },
        { status: 404 }
      );
    }

    // Encontrar el shareholder a eliminar
    const shareholderToDelete = capTable.shareholders.id(shareholderId);
    
    if (!shareholderToDelete) {
      console.error('Shareholder no encontrado. ID buscado:', shareholderId);
      console.error('IDs disponibles:', capTable.shareholders.map((sh: any) => ({
        _id: sh._id?.toString(),
        name: sh.name
      })));
      return NextResponse.json(
        { error: `Shareholder con ID ${shareholderId} no encontrado` },
        { status: 404 }
      );
    }

    const sharesToHandle = shareholderToDelete.shares || 0;
    const action = deleteData.action || 'remove'; // Por defecto: eliminar completamente

    // Manejar las acciones según la acción seleccionada
    if (action === 'return_to_reserved' && shareholderToDelete.type === 'employee') {
      // Regresar al reserved pool
      capTable.reservedPool = (capTable.reservedPool || 0) + sharesToHandle;
    } else if (action === 'transfer' && deleteData.transferToShareholderId) {
      // Transferir a otro shareholder
      const targetShareholder = capTable.shareholders.id(deleteData.transferToShareholderId);
      if (!targetShareholder) {
        return NextResponse.json(
          { error: 'Shareholder destino no encontrado' },
          { status: 404 }
        );
      }
      targetShareholder.shares = (targetShareholder.shares || 0) + sharesToHandle;
    }
    // Si action === 'remove', simplemente eliminamos sin hacer nada más

    // Eliminar el shareholder
    capTable.shareholders.pull(shareholderId);
    await capTable.save();

    // Recargar el documento para obtener los virtuals calculados
    const updatedCapTable = await CapTable.findById(capTable._id);
    if (!updatedCapTable) {
      return NextResponse.json(
        { error: 'Error al recargar el cap table' },
        { status: 500 }
      );
    }

    // Asegurar que los shareholders tengan sus _id incluidos y virtuals calculados
    const capTableData = updatedCapTable.toObject({ virtuals: true });
    if (capTableData.shareholders) {
      capTableData.shareholders = capTableData.shareholders.map((sh: any) => ({
        ...sh,
        _id: sh._id?.toString() || sh._id,
        // Asegurar que los virtuals estén incluidos
        vestedShares: sh.vestedShares || 0,
        unvestedShares: sh.unvestedShares || 0
      }));
    }

    return NextResponse.json(capTableData, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar shareholder:', error);
    return NextResponse.json(
      { error: 'Error al eliminar shareholder' },
      { status: 500 }
    );
  }
}

