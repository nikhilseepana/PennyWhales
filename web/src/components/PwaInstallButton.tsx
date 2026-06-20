import React, { useEffect, useState } from 'react';

const PwaInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as any).standalone);

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  if (installed || !deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1200,
        border: 'none',
        borderRadius: 999,
        padding: '10px 14px',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        fontSize: '0.85rem',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
      }}
      title="Install PennyWhales"
      aria-label="Install PennyWhales"
    >
      Install App
    </button>
  );
};

export default PwaInstallButton;
