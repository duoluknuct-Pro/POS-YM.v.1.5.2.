import { supabase } from "./supabase.js";
import { bulkPut, getAll, put, queueAction, getQueue, deleteQueue } from "./db.js";

export async function fetchInitialData() {
  const online = navigator.onLine;
  if (!online) return {
    products: await getAll("products"),
    categories: await getAll("categories"),
    sales: await getAll("sales")
  };
  const [p,c,s] = await Promise.all([
    supabase.from("products").select("*").eq("active",true).order("name"),
    supabase.from("categories").select("*").eq("active",true).order("name"),
    supabase.from("sales").select("*").order("created_at",{ascending:false}).limit(100)
  ]);
  if (p.error) throw p.error;
  if (c.error) throw c.error;
  if (s.error) throw s.error;
  await bulkPut("products", p.data||[]);
  await bulkPut("categories", c.data||[]);
  await bulkPut("sales", s.data||[]);
  return {products:p.data||[], categories:c.data||[], sales:s.data||[]};
}

export async function createProduct(product) {
  if (!navigator.onLine) {
    await put("products", product);
    await queueAction({type:"insert", table:"products", payload:product});
    return product;
  }
  const {data,error}=await supabase.from("products").insert(product).select().single();
  if(error) throw error; await put("products",data); return data;
}
export async function updateProduct(id, changes) {
  const payload={...changes,id};
  if(!navigator.onLine){await put("products",payload);await queueAction({type:"update",table:"products",payload});return payload;}
  const {data,error}=await supabase.from("products").update(changes).eq("id",id).select().single();
  if(error) throw error; await put("products",data); return data;
}
export async function deleteProduct(id) {
  if(!navigator.onLine){await put("products",{id,active:false});await queueAction({type:"update",table:"products",payload:{id,active:false}});return;}
  const {error}=await supabase.from("products").update({active:false}).eq("id",id);
  if(error) throw error;
  const p=(await getAll("products")).find(x=>x.id===id); if(p) await put("products",{...p,active:false});
}
export async function createSale(sale, items) {
  const salePayload={...sale};
  if(!navigator.onLine){
    await put("sales",salePayload);
    await queueAction({type:"sale",table:"sales",payload:{sale:salePayload,items}});
    return salePayload;
  }
  const {data,error}=await supabase.rpc("create_sale", {p_sale:salePayload,p_items:items});
  if(error) throw error;
  await put("sales",data);
  return data;
}
export async function syncQueue() {
  if(!navigator.onLine) return {synced:0,failed:0};
  const queue=await getQueue(); let synced=0,failed=0;
  for(const item of queue){
    try{
      if(item.table==="products"){
        if(item.type==="insert") await supabase.from("products").insert(item.payload);
        else await supabase.from("products").update(item.payload).eq("id",item.payload.id);
      } else if(item.type==="sale"){
        await supabase.rpc("create_sale",{p_sale:item.payload.sale,p_items:item.payload.items});
      }
      await deleteQueue(item.id); synced++;
    }catch(e){ failed++; console.error("Sync failed",e); }
  }
  if(synced) await fetchInitialData();
  return {synced,failed};
}
