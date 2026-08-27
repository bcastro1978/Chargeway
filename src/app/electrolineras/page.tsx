'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ElectrolinerasMapModal } from '@/components/Landing/ElectrolinerasMapModal';

export default function ElectrolinerasPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <ElectrolinerasMapModal
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        router.push('/');
      }}
      onGoToPlanner={() => router.push('/app')}
    />
  );
}
