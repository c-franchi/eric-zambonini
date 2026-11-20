'use client';
/* eslint react-hooks/set-state-in-effect: off */
import { useEffect, useRef, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
const PRIVACY_NOTICE_KEY = 'eric-privacy-notice-v1';

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const installEventRef = useRef<InstallEvent | null>(null);

  useEffect(() => {
    const iosDevice = isIosDevice();
    setIos(iosDevice);
    if (isStandalone()) { setInstalled(true); return; }

    const onBefore = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as InstallEvent;
      installEventRef.current = promptEvent;
      setInstallEvent(promptEvent);
      const privacyAccepted = (() => { try { return localStorage.getItem(PRIVACY_NOTICE_KEY) === 'acknowledged'; } catch { return false; } })();
      const dismissedUntil = (() => { try { return Number(localStorage.getItem('eric-pwa-dismissed-until') || 0); } catch { return 0; } })();
      if (privacyAccepted && dismissedUntil <= Date.now()) setShow(true);
    };
    const onInstalled = () => { setInstalled(true); setShow(false); };
    const maybeShowManualInstructions = () => {
      if (isStandalone()) { setInstalled(true); return; }
      const dismissedUntil = (() => { try { return Number(localStorage.getItem('eric-pwa-dismissed-until') || 0); } catch { return 0; } })();
      if (dismissedUntil > Date.now()) return;
      if (iosDevice || installEventRef.current) setShow(true);
    };
    const privacyAcknowledged = () => window.setTimeout(maybeShowManualInstructions, 800);

    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('eric-privacy-acknowledged', privacyAcknowledged);

    const privacyAccepted = (() => { try { return localStorage.getItem(PRIVACY_NOTICE_KEY) === 'acknowledged'; } catch { return false; } })();
    const dismissedUntil = (() => { try { return Number(localStorage.getItem('eric-pwa-dismissed-until') || 0); } catch { return 0; } })();
    const timer = window.setTimeout(() => {
      if (isStandalone()) return;
      if (!privacyAccepted) return;
      if (dismissedUntil > Date.now()) return;
      setShow(true);
    }, 4500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('eric-privacy-acknowledged', privacyAcknowledged);
    };
  }, []);

  function close() {
    setShow(false);
    try { localStorage.setItem('eric-pwa-dismissed-until', String(Date.now() + 7 * 86400000)); } catch { /* storage can be disabled */ }
  }

  async function install() {
    if (ios) {
      close();
      return;
    }
    if (!installEvent) { close(); return; }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') { setInstalled(true); setShow(false); }
    installEventRef.current = null;
    setInstallEvent(null);
  }

  if (!show || installed) return null;

  return <aside className={`pwa-prompt${ios ? ' pwa-prompt-ios' : ''}`} aria-label="Instalar aplicativo">
    <div className="pwa-prompt-icon">{ios ? <Share size={21} aria-hidden="true"/> : <Download size={21} aria-hidden="true"/>}</div>
    <div className="pwa-prompt-copy">
      <strong>{ios ? 'Adicione à Tela de Início' : 'Tenha a agenda no celular'}</strong>
      <p>{ios
        ? 'No Safari, toque em Compartilhar (quadrado com seta para cima) e escolha “Adicionar à Tela de Início”. Depois abra pelo ícone para ativar notificações.'
        : installEvent ? 'Instale o app para abrir direto na tela de agendamento e receber avisos.' : 'No menu do navegador, escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.'}</p>
    </div>
    <button className="pwa-install-button" type="button" onClick={()=>void install()}>{ios ? 'Entendi' : installEvent ? 'Instalar' : 'Como instalar'}</button>
    <button className="pwa-close" type="button" aria-label="Dispensar aviso" onClick={close}><X size={19}/></button>
  </aside>;
}
