'use client';

import { useState, useEffect } from 'react';

// BeforeInstallPromptEvent is not in standard TS types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePwaInstallResult {
  isMobile: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  isIos: boolean;
  install: () => Promise<void>;
}

export function usePwaInstall(): UsePwaInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect mobile device (phones and tablets, excludes desktop)
    const ua = navigator.userAgent;
    const forcePwa = typeof window !== 'undefined' && window.location.search.includes('forcePwa=true');
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua) || forcePwa;
    setIsMobile(mobile);

    // Detect iOS specifically (Safari doesn't support beforeinstallprompt)
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIos(ios);

    // Check if already installed (running as standalone)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    // For Android/Chrome — capture the deferred install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Track if user installs
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    // On iOS, the option is always "available" (manual Add to Home Screen)
    if (ios && !standalone) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const install = async () => {
    if (deferredPrompt) {
      // Android/Chrome: trigger native prompt
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
    // iOS: the component handles showing instructions
  };

  return { isMobile, isInstallable, isInstalled, isIos, install };
}
