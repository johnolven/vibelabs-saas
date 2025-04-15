'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Settings() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a la página del perfil por defecto
    router.push('/dashboard/settings/profile');
  }, [router]);

  return null;
} 