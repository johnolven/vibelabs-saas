'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Settings() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a la página del perfil por defecto (admin)
    router.push('/dashboard/admin/profile');
  }, [router]);

  return null;
} 