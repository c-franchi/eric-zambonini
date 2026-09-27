'use client';
/* eslint react-hooks/set-state-in-effect: off */
import { useEffect, useState } from 'react';

function iosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function standaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function iosVersionSupportsPush() {
  const match = navigator.userAgent.match(/OS (\d+)[._](\d+)/);
  return !match || Number(match[1]) > 16 || (Number(match[1]) === 16 && Number(match[2]) >= 4);
}

export default function PushToggle({ owner = false }: { owner?: boolean }) {
  const [status, setStatus] = useState('');
  const [consented, setConsented] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [iosPushSupported, setIosPushSupported] = useState(true);

  useEffect(() => {
    const onIos = iosDevice();
    setIos(onIos);
    setStandalone(standaloneApp());
    setIosPushSupported(!onIos || iosVersionSupportsPush());
  }, []);

  const needsInstall = ios && !standalone;
  const needsUpdate = ios && !iosPushSupported;

  async function enable() {
    try {
      setBusy(true);
      if (!consented) throw Error('Marque a opção para autorizar lembretes e avisos por push.');
      if (needsUpdate) throw Error('As notificações no iPhone exigem iOS 16.4 ou posterior. Atualize o iPhone e tente novamente.');
      if (needsInstall) throw Error('No iPhone, adicione este site à Tela de Início pelo Safari e abra o aplicativo instalado antes de ativar as notificações.');
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw Error('Este navegador não oferece notificações push.');
      const response = await fetch('/api/push');
      if (!response.ok) throw Error('Entre na conta para ativar.');
      const { publicKey } = await response.json() as { publicKey: string };
      if (!publicKey) throw Error('Push ainda não configurado.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw Error('Permissão não concedida.');
      const consent = await fetch('/api/privacy-consent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'push_opt_in', privacyVersion: '2026-09-26' }) });
      if (!consent.ok) throw Error('Não foi possível registrar sua autorização. Tente novamente.');
      const worker = await navigator.serviceWorker.ready;
      const binary = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
      const subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: binary });
      const saved = await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(subscription) });
      if (!saved.ok) throw Error('Não foi possível salvar este dispositivo.');
      setActive(true);
      setStatus('Notificações ativadas neste dispositivo.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível ativar.');
    } finally {
      setBusy(false);
    }
  }

  async function changeConsent(value: boolean) {
    setConsented(value);
    setStatus('');
    if (value || !active) return;
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/push', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      }
      const consent = await fetch('/api/privacy-consent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'push_opt_out', privacyVersion: '2026-09-26' }) });
      if (!consent.ok) throw new Error('Registro indisponível');
      setActive(false);
      setStatus('Notificações desativadas neste dispositivo.');
    } catch {
      setStatus('Não foi possível desativar agora. Tente pelas configurações do dispositivo.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="push-preference">
    {needsInstall && <p className="push-ios-help">Para receber notificações no iPhone: abra este endereço no Safari, toque em <strong>Compartilhar</strong> e em <strong>Adicionar à Tela de Início</strong>. Depois, abra pelo novo ícone. Requer iOS 16.4 ou posterior.</p>}
    {needsUpdate && <p className="push-ios-help">Notificações push no iPhone precisam do iOS 16.4 ou posterior.</p>}
    <label className="push-consent"><input type="checkbox" checked={consented} disabled={busy} onChange={event => void changeConsent(event.target.checked)}/><span>Quero receber lembretes e avisos de agendamento por notificação push. Posso revogar esta autorização.</span></label>
    <button type="button" disabled={!consented || busy || active || needsInstall || needsUpdate} onClick={() => void enable()}>{busy ? 'Aguarde...' : active ? 'Notificações ativadas' : owner ? 'Ativar push neste dispositivo' : 'Ativar lembretes e avisos no celular'}</button>
    <p role="status">{status}</p>
    <a href="/politica-de-privacidade">Como usamos seus dados</a>
  </div>;
}
