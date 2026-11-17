export const $ = (s,root=document)=>root.querySelector(s);
export const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
export const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
export function toast(message,type="success"){const el=document.createElement("div");el.className=`toast ${type}`;el.textContent=message;$("#toastRoot").appendChild(el);setTimeout(()=>el.remove(),2800);}
export function modal(title, body, actions=""){
  const root=$("#modalRoot"); root.innerHTML=`<div class="modal-backdrop" data-close><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-modal-close>×</button></div><div class="modal-body">${body}</div>${actions?`<div class="modal-actions">${actions}</div>`:""}</div></div>`;
  root.querySelector(".modal-backdrop").addEventListener("click",e=>{if(e.target.dataset.close||e.target.dataset.modalClose)root.innerHTML=""});
  return root;
}
export function closeModal(){ $("#modalRoot").innerHTML=""; }
