const cors = {
  "Access-Control-Allow-Origin": "https://daveisinthehouse.github.io",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,Prefer,apikey"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, "Content-Type": "application/json" }
});
const error = (message, status = 400) => json({ message }, status);
async function userFor(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const response = await fetch(env.SUPABASE_URL.replace(/\/$/, "") + "/auth/v1/user", {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization }
  });
  if (!response.ok) {
    let detail = "";
    try { const body = await response.json(); detail = body.message || body.msg || body.error_description || ""; } catch (_) {}
    throw new Error(`Supabase rejected the sign-in token (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return response.json();
}
const uid = () => crypto.randomUUID();
const normalise = row => row ? { ...row, quantity: Number(row.quantity), min_threshold: Number(row.min_threshold) } : row;
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url), path = url.pathname;
    if (path === "/api/health" && request.method === "GET") {
      try { await env.DB.prepare("SELECT 1").first(); return json({ ok: true, database: "tonerstock" }); }
      catch (_) { return error("D1 connection failed", 500); }
    }
    if (!["/toner_items", "/rpc/adjust_toner_stock", "/stock_events"].includes(path)) return error("Not found", 404);
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return error("Worker auth configuration missing", 500);
    let user;
    try { user = await userFor(request, env); } catch (e) { return error(String(e.message || "Could not validate sign-in"), 502); }
    if (!user || !user.id) return error("Please sign in again", 401);
    try {
      if (path === "/toner_items" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT * FROM toner_items ORDER BY brand COLLATE NOCASE, model COLLATE NOCASE").all();
        return json((result.results || []).map(normalise));
      }
      if (path === "/toner_items" && request.method === "POST") {
        const b = await request.json(), id = b.id || uid(), now = new Date().toISOString();
        const item = { id, brand: b.brand, model: String(b.model || "").trim(), color: b.color || "N/A", barcode: b.barcode || null, printers: b.printers || "", quantity: Math.max(0, parseInt(b.quantity,10)||0), min_threshold: Math.max(0,parseInt(b.min_threshold,10)||0), created_at: now, updated_at: now };
        if (!["HP","Kyocera"].includes(item.brand) || !item.model) return error("Valid brand and model required");
        await env.DB.prepare("INSERT INTO toner_items (id,brand,model,color,barcode,printers,quantity,min_threshold,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(item.id,item.brand,item.model,item.color,item.barcode,item.printers,item.quantity,item.min_threshold,now,now).run();
        if (item.quantity) await env.DB.prepare("INSERT INTO stock_events (toner_id,delta,event_type,barcode) VALUES (?,?,?,?)").bind(id,item.quantity,"import",item.barcode).run();
        return json([item], 201);
      }
      if (path === "/toner_items" && request.method === "PATCH") {
        const id = (url.searchParams.get("id") || "").replace(/^eq\./,"");
        if (!id) return error("Missing item id");
        const b = await request.json(), old = await env.DB.prepare("SELECT * FROM toner_items WHERE id=?").bind(id).first();
        if (!old) return error("Item not found",404);
        const item = { brand:b.brand??old.brand, model:String(b.model??old.model).trim(), color:b.color??old.color, barcode:b.barcode===undefined?old.barcode:(b.barcode||null), printers:b.printers??old.printers, quantity:b.quantity===undefined?Number(old.quantity):Math.max(0,parseInt(b.quantity,10)||0), min_threshold:b.min_threshold===undefined?Number(old.min_threshold):Math.max(0,parseInt(b.min_threshold,10)||0) };
        const now = new Date().toISOString();
        await env.DB.prepare("UPDATE toner_items SET brand=?,model=?,color=?,barcode=?,printers=?,quantity=?,min_threshold=?,updated_at=? WHERE id=?").bind(item.brand,item.model,item.color,item.barcode,item.printers,item.quantity,item.min_threshold,now,id).run();
        const delta=item.quantity-Number(old.quantity);
        if(delta) await env.DB.prepare("INSERT INTO stock_events (toner_id,delta,event_type,barcode) VALUES (?,?,?,?)").bind(id,delta,delta>0?"manual_add":"manual_remove",item.barcode).run();
        return json([normalise(await env.DB.prepare("SELECT * FROM toner_items WHERE id=?").bind(id).first())]);
      }
      if (path === "/toner_items" && request.method === "DELETE") {
        const id=(url.searchParams.get("id")||"").replace(/^eq\./,"");
        if(!id)return error("Missing item id");
        await env.DB.prepare("DELETE FROM toner_items WHERE id=?").bind(id).run();
        return new Response(null,{status:204,headers:cors});
      }
      if (path === "/rpc/adjust_toner_stock" && request.method === "POST") {
        const b=await request.json(), id=b.p_toner_id, delta=parseInt(b.p_delta,10);
        if(!id||!Number.isInteger(delta)||!delta)return error("Toner id and non-zero delta required");
        const old=await env.DB.prepare("SELECT * FROM toner_items WHERE id=?").bind(id).first();
        if(!old)return error("Item not found",404);
        const quantity=Math.max(0,Number(old.quantity)+delta), actual=quantity-Number(old.quantity), now=new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare("UPDATE toner_items SET quantity=?,updated_at=? WHERE id=?").bind(quantity,now,id),
          env.DB.prepare("INSERT INTO stock_events (toner_id,delta,event_type,barcode) VALUES (?,?,?,?)").bind(id,actual,["scan","manual_add","manual_remove","undo","import"].includes(b.p_event_type)?b.p_event_type:"manual_add",b.p_barcode||old.barcode||null)
        ]);
        return json(normalise(await env.DB.prepare("SELECT * FROM toner_items WHERE id=?").bind(id).first()));
      }
      if(path==="/stock_events"&&request.method==="GET"){
        const result=await env.DB.prepare("SELECT * FROM stock_events ORDER BY created_at DESC LIMIT 500").all();
        return json(result.results||[]);
      }
      return error("Method not allowed",405);
    } catch(e) {
      const message=String(e.message||e);
      return error(message.includes("UNIQUE constraint failed")?"That barcode is already assigned to another item":message,message.includes("UNIQUE constraint failed")?409:500);
    }
  }
};