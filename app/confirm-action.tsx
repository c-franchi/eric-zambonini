'use client';
import { useRef, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type ConfirmOptions={title:string;description:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean};
export function useConfirmAction(){
  const [request,setRequest]=useState<ConfirmOptions|null>(null);
  const resolveRef=useRef<((confirmed:boolean)=>void)|null>(null);
  function confirm(options:ConfirmOptions){return new Promise<boolean>(resolve=>{resolveRef.current=resolve;setRequest(options)})}
  function finish(confirmed:boolean){const resolve=resolveRef.current;resolveRef.current=null;setRequest(null);resolve?.(confirmed)}
  const dialog=request&&<AlertDialog open onOpenChange={open=>{if(!open)finish(false)}}>
    <AlertDialogContent className="site-confirm-dialog">
      <AlertDialogHeader className="site-confirm-header"><AlertDialogTitle className="site-confirm-title">{request.title}</AlertDialogTitle><AlertDialogDescription className="site-confirm-description">{request.description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter className="site-confirm-footer"><AlertDialogCancel className="site-confirm-cancel" onClick={()=>finish(false)}>{request.cancelLabel||'Voltar'}</AlertDialogCancel><AlertDialogAction className={`site-confirm-accept${request.danger?' is-danger':''}`} onClick={()=>finish(true)}>{request.confirmLabel||'Confirmar'}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
  return {confirm,dialog};
}
