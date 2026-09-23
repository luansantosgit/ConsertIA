import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Processa a fila de mensagens agendadas (chamada pelo pg_cron a cada 30s).
// Nao requer JWT — e acionada internamente pelo cron do banco.
serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();
    const stale = new Date(Date.now() - 120_000).toISOString();

    // Claim atomico: pendentes vencidas ou travadas em "processing" ha mais de 2 min
    const { data: rows, error: claimError } = await supabase
      .from("scheduled_messages")
      .update({ status: "processing", claimed_at: now })
      .or(
        `and(status.eq.pending,scheduled_at.lte."${now}"),` +
        `and(status.eq.processing,claimed_at.lte."${stale}")`
      )
      .select();

    if (claimError) {
      console.error("[sched] claim error:", claimError.message);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("platform_settings")
      .select("uazapi_subdomain")
      .limit(1)
      .maybeSingle();
    const baseUrl = `https://${settings?.uazapi_subdomain || "api"}.uazapi.com`;

    let processed = 0;
    for (const row of rows) {
      try {
        // Resolve a conversa (por id, telefone, ou cria)
        let conv = row.conversation_id
          ? (await supabase.from("conversations").select("*").eq("id", row.conversation_id).maybeSingle()).data
          : null;
        if (!conv) {
          conv = (await supabase
            .from("conversations")
            .select("*")
            .eq("contact_phone", row.contact_phone)
            .eq("tenant_id", row.tenant_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()).data;
        }
        if (!conv) {
          const inserted = await supabase
            .from("conversations")
            .insert({
              tenant_id: row.tenant_id,
              contact_phone: row.contact_phone,
              contact_name: row.customer_name,
              customer_id: row.customer_id,
              status: "open",
              unread_count: 0,
              last_message_at: now,
            })
            .select()
            .single();
          conv = inserted.data;
        }
        if (!conv) {
          await supabase
            .from("scheduled_messages")
            .update({ status: "failed", error: "Conversa nao encontrada/criada" })
            .eq("id", row.id);
          continue;
        }

        // Envia via Uazapi
        const { data: conn } = await supabase
          .from("connections")
          .select("id, instance_token")
          .eq("tenant_id", row.tenant_id)
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();

        let waMessageId: string | undefined;
        let msgStatus = "sent";
        if (conn?.instance_token) {
          const resp = await fetch(`${baseUrl}/send/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json", token: conn.instance_token },
            body: JSON.stringify({ number: conv.contact_phone, text: row.content }),
          });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok) {
            waMessageId = data?.messageid || data?.key?.id || data?.id || undefined;
            msgStatus = (data?.status || "sent").toString().toLowerCase();
          } else {
            msgStatus = "error";
            console.error("[sched] send error:", data?.error || resp.status);
          }
        }

        // Registra no historico do chat
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          tenant_id: row.tenant_id,
          contact_phone: conv.contact_phone,
          content: row.content,
          direction: "outbound",
          read: true,
          status: msgStatus,
          wa_message_id: waMessageId,
        });

        await supabase
          .from("conversations")
          .update({
            last_message: row.content.substring(0, 100),
            last_message_at: now,
          })
          .eq("id", conv.id);

        await supabase
          .from("scheduled_messages")
          .update({ status: "sent" })
          .eq("id", row.id);

        processed++;
      } catch (err) {
        console.error("[sched] row error:", (err as Error).message);
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed", error: (err as Error).message })
          .eq("id", row.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scheduled messages worker error:", error);
    return new Response(JSON.stringify({ ok: true, error: (error as Error).message }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
});
