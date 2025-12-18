import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CapTable from '@/models/CapTable';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { hasPermission } from '@/lib/permissions';

// GET: Obtener cap table (solo lectura para investors, boardmembers)
export async function GET(request: NextRequest) {
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

    if (!hasPermission(user.role, 'read_cap_table')) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver el cap table' },
        { status: 403 }
      );
    }

    // Obtener el cap table (asumimos una sola empresa por ahora)
    const capTable = await CapTable.findOne().sort({ createdAt: -1 });

    if (!capTable) {
      return NextResponse.json({
        companyName: '',
        totalShares: 0,
        shareholders: [],
        fullyDilutedShares: 0,
        outstandingShares: 0,
        reservedPool: 0
      });
    }

    // Asegurar que los shareholders tengan sus _id incluidos y virtuals calculados
    const capTableData = capTable.toObject({ virtuals: true });
    if (capTableData.shareholders) {
      capTableData.shareholders = capTableData.shareholders.map((sh: any) => ({
        ...sh,
        _id: sh._id?.toString() || sh._id,
        // Asegurar que los virtuals estén incluidos
        vestedShares: sh.vestedShares || 0,
        unvestedShares: sh.unvestedShares || 0
      }));
    }

    return NextResponse.json(capTableData);
  } catch (error) {
    console.error('Error al obtener cap table:', error);
    return NextResponse.json(
      { error: 'Error al obtener el cap table' },
      { status: 500 }
    );
  }
}

// POST: Crear o actualizar configuración básica del cap table (solo founders/admins)
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
    const data = await request.json();
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

    // Validar datos
    if (!data.companyName || data.totalShares === undefined) {
      return NextResponse.json(
        { error: 'Nombre de empresa y total de shares son requeridos' },
        { status: 400 }
      );
    }

    if (data.totalShares < 0) {
      return NextResponse.json(
        { error: 'El total de shares debe ser mayor o igual a 0' },
        { status: 400 }
      );
    }

    // Validar que reserved pool no exceda el total de shares
    const reservedPool = data.reservedPool ? Number(data.reservedPool) : 0;
    if (reservedPool < 0) {
      return NextResponse.json(
        { error: 'El reserved pool debe ser mayor o igual a 0' },
        { status: 400 }
      );
    }
    
    if (reservedPool > data.totalShares) {
      return NextResponse.json(
        { error: `El reserved pool (${reservedPool.toLocaleString()}) no puede exceder el total de shares autorizadas (${data.totalShares.toLocaleString()})` },
        { status: 400 }
      );
    }

    // Buscar cap table existente o crear uno nuevo
    let capTable = await CapTable.findOne().sort({ createdAt: -1 });
    
    if (capTable) {
      // Validar que outstanding + reserved no exceda el total
      const totalShareholderShares = capTable.shareholders.reduce((sum, sh) => sum + (sh.shares || 0), 0);
      const newReservedPool = reservedPool;
      const newTotalShares = Number(data.totalShares);
      
      if (totalShareholderShares + newReservedPool > newTotalShares) {
        return NextResponse.json(
          { error: `La suma de shares asignadas (${totalShareholderShares.toLocaleString()}) + reserved pool (${newReservedPool.toLocaleString()}) = ${(totalShareholderShares + newReservedPool).toLocaleString()} excede el total autorizado (${newTotalShares.toLocaleString()})` },
          { status: 400 }
        );
      }
      
      // Actualizar existente (solo configuración básica, no shareholders)
      capTable.companyName = data.companyName;
      capTable.totalShares = newTotalShares;
      capTable.reservedPool = newReservedPool;
      
      // El middleware recalculará automáticamente outstanding, fullyDiluted y ownership percentages
      await capTable.save();
    } else {
      // Crear nuevo
      capTable = await CapTable.create({
        companyName: data.companyName,
        totalShares: Number(data.totalShares),
        shareholders: [],
        reservedPool: data.reservedPool ? Number(data.reservedPool) : 0,
        createdBy: userId
      });
    }

    return NextResponse.json(capTable, { status: 200 });
  } catch (error) {
    console.error('Error al guardar cap table:', error);
    return NextResponse.json(
      { error: 'Error al guardar el cap table' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar configuración del cap table
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
    const data = await request.json();
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

    const capTable = await CapTable.findOne().sort({ createdAt: -1 });
    
    if (!capTable) {
      return NextResponse.json(
        { error: 'Cap table no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar solo los campos proporcionados
    if (data.companyName !== undefined) capTable.companyName = data.companyName;
    if (data.totalShares !== undefined) {
      if (data.totalShares < 0) {
        return NextResponse.json(
          { error: 'El total de shares debe ser mayor o igual a 0' },
          { status: 400 }
        );
      }
      capTable.totalShares = Number(data.totalShares);
    }
    if (data.reservedPool !== undefined) {
      const newReservedPool = Number(data.reservedPool);
      if (newReservedPool < 0) {
        return NextResponse.json(
          { error: 'El reserved pool debe ser mayor o igual a 0' },
          { status: 400 }
        );
      }
      
      // Validar que outstanding + reserved no exceda el total
      const totalShareholderShares = capTable.shareholders.reduce((sum, sh) => sum + (sh.shares || 0), 0);
      const totalShares = data.totalShares !== undefined ? Number(data.totalShares) : capTable.totalShares;
      
      if (totalShareholderShares + newReservedPool > totalShares) {
        return NextResponse.json(
          { error: `La suma de shares asignadas (${totalShareholderShares.toLocaleString()}) + reserved pool (${newReservedPool.toLocaleString()}) = ${(totalShareholderShares + newReservedPool).toLocaleString()} excede el total autorizado (${totalShares.toLocaleString()})` },
          { status: 400 }
        );
      }
      
      capTable.reservedPool = newReservedPool;
    }

    // El middleware recalculará automáticamente outstanding, fullyDiluted y ownership percentages
    await capTable.save();

    return NextResponse.json(capTable, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar cap table:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el cap table' },
      { status: 500 }
    );
  }
}

