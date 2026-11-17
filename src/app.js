import { supabase } from "./supabase.js";
import { fetchInitialData, createProduct, updateProduct, deleteProduct, createSale, syncQueue } from "./api.js";
import { getAll } from "./db.js";
import { $, $$, rupiah, toast, modal, closeModal } from "./ui.js";

const state={products:[],categories:[],sales:[],cart:[],profile:null,deferredInstall:null};

function setOnlineUI(){
  const online=navigator.onLine;
  $("#syncBadge").textContent=online?"● Online":"● Offline";
  $("#syncBadge").style.color=online?"#22c55e":"#f59e0b";
  if($("#posMode")){$("#posMode").textContent=online?"ONLINE":"OFFLINE";$("#posMode").style.color=online?"#22c55e":"#f59e0b";}
}
function showView(view){
  $$(".view").forEach(x=>x.classList.add("hidden"));
  $(`#${view}View`).classList.remove("hidden");
  $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  if(view==="dashboard")renderDashboard();
  if(view==="pos")renderPOS();
  if(view==="products")renderProducts();
  if(view==="inventory")renderInventory();
  if(view==="sales")renderSales();
}
function roleLabel(r){return ({owner:"OWNER",admin:"ADMIN",cashier:"KASIR"})[r]||String(r||"USER").toUpperCase();}
async function boot(){
  const {data:{session}}=await supabase.auth.getSession();
  if(session){await enterApp(session);}
  else {$("#loginView").classList.remove("hidden");$("#appView").classList.add("hidden");}
  window.addEventListener("online",async()=>{setOnlineUI();try{const r=await syncQueue();if(r.synced)toast(`${r.synced} data tersinkronisasi`);await loadData();}catch(e){console.error(e)}});
  window.addEventListener("offline",setOnlineUI);
  setOnlineUI();
}
async function enterApp(session){
  $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");
  let profile;
  if(navigator.onLine){
    const {data,error}=await supabase.from("profiles").select("*").eq("id",session.user.id).single();
    if(error) throw error; profile=data;
    localStorage.setItem("ym_profile",JSON.stringify(profile));
  }else profile=JSON.parse(localStorage.getItem("ym_profile")||"null");
  if(!profile) throw new Error("Profil belum tersedia untuk mode offline.");
  state.profile=profile;
  $("#userName").textContent=profile.full_name||session.user.email;
  $("#userRole").textContent=roleLabel(profile.role);
  await loadData();
  showView("dashboard");
}
async function loadData(){
  const data=await fetchInitialData(); state.products=data.products.filter(p=>p.active!==false);state.categories=data.categories;state.sales=data.sales;
}
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#loginStatus").textContent="Memproses...";
  try{
    const {data,error}=await supabase.auth.signInWithPassword({email:$("#loginEmail").value,password:$("#loginPassword").value});
    if(error) throw error; await enterApp(data.session); $("#loginStatus").textContent="";
  }catch(err){$("#loginStatus").textContent=err.message;toast("Login gagal","error")}
});
$("#logoutBtn").addEventListener("click",async()=>{await supabase.auth.signOut();location.reload()});
$("#mainNav").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)showView(b.dataset.view)});

function renderDashboard(){
  const today=new Date().toISOString().slice(0,10);
  const sales=state.sales.filter(s=>String(s.created_at||"").slice(0,10)===today && s.status==="PAID");
  $("#mSales").textContent=rupiah(sales.reduce((a,s)=>a+Number(s.total),0));
  $("#mTransactions").textContent=sales.length;
  $("#mProducts").textContent=state.products.length;
  const low=state.products.filter(p=>Number(p.stock)<=Number(p.minimum_stock));
  $("#mLowStock").textContent=low.length;
  $("#lowStockList").innerHTML=low.length?low.map(p=>`<div class="list-row"><span>${p.name}</span><strong>${p.stock}</strong></div>`).join(""):`<div class="empty">Semua stok aman.</div>`;
  $("#recentSales").innerHTML=state.sales.slice(0,6).map(s=>`<div class="list-row"><span>${s.invoice_number}<br><span class="muted">${new Date(s.created_at).toLocaleString("id-ID")}</span></span><strong>${rupiah(s.total)}</strong></div>`).join("")||`<div class="empty">Belum ada transaksi.</div>`;
}
function renderPOS(){
  $("#categoryFilter").innerHTML=`<option value="">Semua kategori</option>`+state.categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
  drawProductGrid();
  drawCart();
}
function drawProductGrid(){
  const q=$("#productSearch").value.toLowerCase(), cat=$("#categoryFilter").value;
  const list=state.products.filter(p=>(!q||p.name.toLowerCase().includes(q))&&(!cat||p.category_id===cat));
  $("#productGrid").innerHTML=list.map(p=>`<button class="product-card" data-product="${p.id}"><div class="pic">${p.image_url?`<img src="${p.image_url}" alt="">`:""}</div><div class="name">${p.name}</div><div class="price">${rupiah(p.price)}</div><div class="stock">Stok: ${p.stock}</div></button>`).join("")||`<div class="empty">Produk tidak ditemukan.</div>`;
}
$("#productSearch").addEventListener("input",drawProductGrid);
$("#categoryFilter").addEventListener("change",drawProductGrid);
$("#productGrid").addEventListener("click",e=>{const b=e.target.closest("[data-product]");if(!b)return;const p=state.products.find(x=>x.id===b.dataset.product);if(!p||p.stock<=0)return toast("Stok habis","error");const existing=state.cart.find(x=>x.product_id===p.id);if(existing)existing.quantity++;else state.cart.push({product_id:p.id,name:p.name,price:Number(p.price),quantity:1});drawCart()});
function drawCart(){
  $("#cartItems").innerHTML=state.cart.length?state.cart.map((x,i)=>`<div class="cart-row"><div><div class="cart-name">${x.name}</div><div class="cart-sub">${rupiah(x.price)} × ${x.quantity}</div></div><div class="qty"><button data-minus="${i}">−</button><span>${x.quantity}</span><button data-plus="${i}">+</button></div></div>`).join(""):`<div class="empty">Keranjang kosong.</div>`;
  const sub=state.cart.reduce((a,x)=>a+x.price*x.quantity,0), disc=Math.max(0,Number($("#cartDiscount").value||0)), total=Math.max(0,sub-disc);
  $("#cartSubtotal").textContent=rupiah(sub);$("#cartTotal").textContent=rupiah(total);
}
$("#cartItems").addEventListener("click",e=>{const i=e.target.dataset.plus??e.target.dataset.minus;if(i===undefined)return;const n=Number(i);if(e.target.dataset.plus)state.cart[n].quantity++;else state.cart[n].quantity--;if(state.cart[n].quantity<=0)state.cart.splice(n,1);drawCart()});
$("#cartDiscount").addEventListener("input",drawCart);
$("#clearCart").addEventListener("click",()=>{state.cart=[];drawCart()});
$("#payBtn").addEventListener("click",()=>openPayment());

function openPayment(){
  if(!state.cart.length)return toast("Keranjang masih kosong","error");
  const sub=state.cart.reduce((a,x)=>a+x.price*x.quantity,0),disc=Math.max(0,Number($("#cartDiscount").value||0)),total=Math.max(0,sub-disc);
  const root=modal("Pembayaran",`<div class="form-grid"><label class="full">Total<input value="${rupiah(total)}" disabled></label><label>Metode<select id="payMethod"><option>CASH</option><option>QRIS</option><option>TRANSFER</option><option>DEBIT</option><option>E-WALLET</option></select></label><label>Uang Diterima<input id="payAmount" type="number" value="${total}" min="${total}"></label></div>`,`<button class="btn" data-modal-close>Batal</button><button class="btn btn-gold" id="confirmPay">Proses Pembayaran</button>`);
  root.querySelector("#confirmPay").onclick=async()=>{
    const method=root.querySelector("#payMethod").value, amount=Number(root.querySelector("#payAmount").value||0);
    if(method==="CASH"&&amount<total)return toast("Uang diterima kurang","error");
    const sale={id:crypto.randomUUID(),invoice_number:`TRX-${new Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14)}-${Math.floor(Math.random()*900+100)}`,cashier_id:state.profile.id,subtotal:sub,discount:disc,total,payment_method:method,payment_amount:amount,change_amount:Math.max(0,amount-total),status:"PAID",created_at:new Date().toISOString()};
    const items=state.cart.map(x=>({product_id:x.product_id,product_name:x.name,quantity:x.quantity,price:x.price,subtotal:x.price*x.quantity}));
    try{await createSale(sale,items);closeModal();state.cart=[];$("#cartDiscount").value=0;await loadData();drawCart();toast(navigator.onLine?"Transaksi tersimpan":"Transaksi tersimpan offline");}
    catch(err){toast(err.message,"error")}
  };
}

function productForm(p={}){
  return `<div class="form-grid">
  <label>Nama Produk<input id="fName" value="${p.name||""}" required></label>
  <label>Kategori<select id="fCategory">${state.categories.map(c=>`<option value="${c.id}" ${c.id===p.category_id?"selected":""}>${c.name}</option>`).join("")}</select></label>
  <label>Harga Jual<input id="fPrice" type="number" min="0" value="${p.price||0}"></label>
  <label>Harga Modal<input id="fCost" type="number" min="0" value="${p.cost_price||0}"></label>
  <label>Stok<input id="fStock" type="number" min="0" value="${p.stock||0}"></label>
  <label>Minimum Stok<input id="fMin" type="number" min="0" value="${p.minimum_stock||0}"></label>
  <label class="full">URL Foto Produk<input id="fImage" value="${p.image_url||""}" placeholder="https://..."></label>
  </div>`;
}
$("#addProductBtn").addEventListener("click",()=>{
  const root=modal("Tambah Produk",productForm(),`<button class="btn" data-modal-close>Batal</button><button class="btn btn-gold" id="saveProduct">Simpan</button>`);
  root.querySelector("#saveProduct").onclick=async()=>{try{const p={id:crypto.randomUUID(),name:$("#fName",root).value.trim(),category_id:$("#fCategory",root).value,price:Number($("#fPrice",root).value),cost_price:Number($("#fCost",root).value),stock:Number($("#fStock",root).value),minimum_stock:Number($("#fMin",root).value),image_url:$("#fImage",root).value.trim()||null,active:true};if(!p.name)return toast("Nama produk wajib diisi","error");await createProduct(p);closeModal();await loadData();renderProducts();toast("Produk dibuat")}catch(e){toast(e.message,"error")}};
});
function renderProducts(){
  $("#productTable").innerHTML=state.products.map(p=>{const c=state.categories.find(x=>x.id===p.category_id);return `<tr><td><strong>${p.name}</strong></td><td>${c?.name||"-"}</td><td>${rupiah(p.price)}</td><td>${p.stock}</td><td>${p.minimum_stock}</td><td>${statusTag(p)}</td><td><div class="actions"><button class="btn mini" data-edit="${p.id}">Edit</button><button class="btn mini" data-del="${p.id}">Hapus</button></div></td></tr>`}).join("")||`<tr><td colspan="7"><div class="empty">Belum ada produk.</div></td></tr>`;
}
function statusTag(p){return Number(p.stock)<=0?`<span class="tag out">Habis</span>`:Number(p.stock)<=Number(p.minimum_stock)?`<span class="tag low">Menipis</span>`:`<span class="tag ok">Aman</span>`}
$("#productTable").addEventListener("click",async e=>{
  const id=e.target.dataset.edit||e.target.dataset.del;if(!id)return;const p=state.products.find(x=>x.id===id);
  if(e.target.dataset.del){if(confirm(`Hapus ${p.name}?`)){await deleteProduct(id);await loadData();renderProducts();toast("Produk dinonaktifkan")};return}
  const root=modal("Edit Produk",productForm(p),`<button class="btn" data-modal-close>Batal</button><button class="btn btn-gold" id="updateProduct">Simpan Perubahan</button>`);
  root.querySelector("#updateProduct").onclick=async()=>{try{await updateProduct(id,{name:$("#fName",root).value.trim(),category_id:$("#fCategory",root).value,price:Number($("#fPrice",root).value),cost_price:Number($("#fCost",root).value),stock:Number($("#fStock",root).value),minimum_stock:Number($("#fMin",root).value),image_url:$("#fImage",root).value.trim()||null});closeModal();await loadData();renderProducts();toast("Produk diperbarui")}catch(err){toast(err.message,"error")}};
});
function renderInventory(){ $("#stockTable").innerHTML=state.products.map(p=>`<tr><td>${p.name}</td><td><strong>${p.stock}</strong></td><td>${p.minimum_stock}</td><td>${statusTag(p)}</td><td><button class="btn mini" data-stock="${p.id}">Koreksi</button></td></tr>`).join("");}
$("#stockTable").addEventListener("click",e=>{const id=e.target.dataset.stock;if(!id)return;const p=state.products.find(x=>x.id===id);const root=modal("Koreksi Stok",`<div class="form-grid"><label>Produk<input value="${p.name}" disabled></label><label>Stok Baru<input id="newStock" type="number" min="0" value="${p.stock}"></label><label class="full>Catatan<input id="stockNote" placeholder="Contoh: stock opname"></label></div>`,`<button class="btn" data-modal-close>Batal</button><button class="btn btn-gold" id="saveStock">Simpan</button>`);root.querySelector("#saveStock").onclick=async()=>{try{await updateProduct(id,{stock:Number(root.querySelector("#newStock").value)});closeModal();await loadData();renderInventory();toast("Stok diperbarui")}catch(err){toast(err.message,"error")}}});
function renderSales(){ $("#salesTable").innerHTML=state.sales.map(s=>`<tr><td>${s.invoice_number}</td><td>${new Date(s.created_at).toLocaleString("id-ID")}</td><td>${rupiah(s.total)}</td><td>${s.payment_method}</td><td><span class="tag ok">${s.status}</span></td></tr>`).join("")||`<tr><td colspan="5"><div class="empty">Belum ada transaksi.</div></td></tr>`; }

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();state.deferredInstall=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").addEventListener("click",async()=>{if(!state.deferredInstall)return;state.deferredInstall.prompt();state.deferredInstall=null});
boot().catch(err=>{console.error(err);toast(err.message,"error")});
