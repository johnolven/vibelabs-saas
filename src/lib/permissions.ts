import { UserRole } from '@/models/User';

export type Permission = 
  | 'read_cap_table'
  | 'write_cap_table'
  | 'read_documents'
  | 'write_documents'
  | 'read_updates'
  | 'write_updates'
  | 'read_metrics'
  | 'write_metrics'
  | 'comment'
  | 'manage_users'
  | 'send_updates';

// Definir permisos por rol
const rolePermissions: Record<UserRole, Permission[]> = {
  founder: [
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
  admin: [
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
  investor: [
    'read_cap_table',
    'read_documents',
    'read_updates',
    'read_metrics',
    'comment'
  ],
  boardmember: [
    'read_cap_table',
    'read_documents',
    'read_updates',
    'read_metrics',
    'comment'
  ],
  potential_investor: [
    'read_documents', // Solo documentos públicos o con acceso específico
    'read_updates' // Solo updates públicos
  ],
  follower: [
    'read_updates' // Solo product updates (updates públicos)
  ]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
}

export function canAccessFolder(role: UserRole, folder: string): boolean {
  // Founders y admins pueden acceder a todo
  if (role === 'founder' || role === 'admin') {
    return true;
  }

  // Board members pueden acceder a board materials y documentos públicos
  if (role === 'boardmember') {
    return folder === 'board_materials' || folder === 'pitch_deck';
  }

  // Investors pueden acceder a financials, board materials y pitch deck
  if (role === 'investor') {
    return ['financials', 'board_materials', 'pitch_deck'].includes(folder);
  }

  // Potential investors solo pueden acceder a pitch deck
  if (role === 'potential_investor') {
    return folder === 'pitch_deck';
  }

  // Followers no tienen acceso a documentos
  if (role === 'follower') {
    return false;
  }

  return false;
}

export function canComment(role: UserRole): boolean {
  return ['founder', 'admin', 'investor', 'boardmember'].includes(role);
}

export function canWrite(role: UserRole): boolean {
  return ['founder', 'admin'].includes(role);
}

