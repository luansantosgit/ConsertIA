import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();

    // Uazapi envia EventType no topo (nao "event")
    // Formato real: { EventType: "messages", message: {...}, chat: {...}, ... }
    // Formato spec: { event: "messages", instance: "...", data: {...} }
    const eventType = body?.EventType || body?.event;
    const instanceName = body?.instanceName || body?.instance;

    if (!eventType) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── messages / history ──
    if (eventType === "messages" || eventType === "history") {
      // Obter configuracao de conexão para download de mídia e tenant_id
      let instanceToken = "";
      let connectionTenantId: string | null = null;
      let connectionId: string | null = null;
      let aiEnabled = false;
      const connectionColumns = "id, instance_token, tenant_id, ai_enabled";
      if (instanceName) {
        const { data: conn } = await supabase
          .from("connections")
          .select(connectionColumns)
          .eq("instance_name", instanceName)
          .limit(1)
          .maybeSingle();
        if (conn?.instance_token) instanceToken = conn.instance_token;
        if (conn?.tenant_id) connectionTenantId = conn.tenant_id;
        if (conn?.id) connectionId = conn.id;
        aiEnabled = conn?.ai_enabled === true;
      }
      if (!instanceToken || !connectionTenantId) {
        const { data: conn } = await supabase
          .from("connections")
          .select(connectionColumns)
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();
        if (conn?.instance_token) instanceToken = conn.instance_token;
        if (conn?.tenant_id) connectionTenantId = conn.tenant_id;
        if (conn?.id) connectionId = conn.id;
        aiEnabled = conn?.ai_enabled === true;
      }
      if (!connectionTenantId) {
        const { data: anyTenant } = await supabase
          .from("tenants")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (anyTenant?.id) connectionTenantId = anyTenant.id;
      }
      const { data: platSettings } = await supabase
        .from("platform_settings")
        .select("uazapi_subdomain")
        .limit(1)
        .maybeSingle();
      if (platSettings?.uazapi_subdomain) {
        uazapiSubdomain = platSettings.uazapi_subdomain;
      }

      // Uazapi envia message diretamente no body, nao dentro de data
      const msgData = body?.message || body?.data;
      const messages = Array.isArray(msgData) ? msgData : msgData ? [msgData] : [];

      for (const msg of messages) {
        if (msg.fromMe === true) continue;

        // Dados do chat podem vir no body, em data ou dentro da propria mensagem
        const chatData: any =
          body?.chat || body?.data?.chat || (msg as any)?.chat || null;

        const chatId = msg.chatid || msg.sender || "";
        const isGroup = chatId.endsWith("@g.us");
        // Grupos: usa o JID do grupo como chave. Individuais: telefone limpo
        const rawPhone = isGroup
          ? chatId
          : chatId.replace("@s.whatsapp.net", "").replace("@lid", "");
        const phone = rawPhone.replace(/^\+/, "");
        const waMessageId = msg.messageid || msg.id || "";
        const senderName = msg.senderName || "";
        const timestamp = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp)).toISOString()
          : new Date().toISOString();

        // Normalizacao de tipo de mensagem (UazAPI envia PascalCase, ex: ImageMessage)
        const rawType = (msg.messageType || msg.type || "").toString().toLowerCase();

        // Se for mensagem técnica de resumo de álbum, não criar mensagem de texto redundante
        const isAlbumHeader = rawType.includes("album") ||
          (typeof msg.text === "string" && /^Album:\s*\d+\s*images?/i.test(msg.text.trim()));
        if (isAlbumHeader) {
          continue;
        }

        // Mídia recebida (imagem, video, audio, documento, figurinha)
        let mediaType: string | null = null;
        if (rawType.includes("image")) {
          mediaType = "image";
        } else if (rawType.includes("video") || rawType === "ptv") {
          mediaType = "video";
        } else if (rawType.includes("audio") || rawType === "ptt") {
          mediaType = rawType.includes("ptt") ? "ptt" : "audio";
        } else if (rawType.includes("document")) {
          mediaType = "document";
        } else if (rawType.includes("sticker")) {
          mediaType = "sticker";
        }

        // Fallback: verificar se msg.content é um objeto com mimetype
        if (!mediaType && typeof msg.content === "object" && msg.content !== null) {
          const mime = (msg.content.mimetype || "").toString().toLowerCase();
          if (mime.startsWith("image/")) mediaType = "image";
          else if (mime.startsWith("video/")) mediaType = "video";
          else if (mime.startsWith("audio/")) mediaType = "audio";
          else if (mime) mediaType = "document";
        }

        // Fallback: verificar se msg.text veio serializado como JSON de mídia do WhatsApp
        if (!mediaType && typeof msg.text === "string" && msg.text.startsWith('{"URL":"')) {
          try {
            const parsed = JSON.parse(msg.text);
            const mime = (parsed.mimetype || "").toString().toLowerCase();
            if (mime.startsWith("image/")) mediaType = "image";
            else if (mime.startsWith("video/")) mediaType = "video";
            else if (mime.startsWith("audio/")) mediaType = "audio";
            else if (mime) mediaType = "document";
          } catch {
            // ignore
          }
        }

        // Extrair legenda legítima do cliente se houver (sem salvar JSON bruto como texto)
        let caption = "";
        if (typeof msg.content === "object" && msg.content !== null && typeof msg.content.caption === "string") {
          caption = msg.content.caption.trim();
        } else if (typeof msg.text === "string" && !msg.text.trim().startsWith("{") && !msg.text.trim().startsWith("Album: ")) {
          caption = msg.text.trim();
        }

        let content = caption;
        if (mediaType && !content) {
          content = mediaType === "image" ? "📷 Imagem"
            : mediaType === "video" ? "🎥 Vídeo"
            : mediaType === "ptt" ? "🎤 Mensagem de voz"
            : mediaType === "audio" ? "🎤 Áudio"
            : mediaType === "sticker" ? "🎭 Figurinha"
            : "📄 Documento";
        } else if (!mediaType && !content) {
          content = typeof msg.text === "string" ? msg.text : (typeof msg.content === "string" ? msg.content : "");
        }

        if (!content && !msg.messageType?.includes("reaction")) continue;

        const phoneWithout55 = phone.startsWith("55") ? phone.slice(2) : phone;
        const phoneWith55 = phone.startsWith("55") ? phone : `55${phone}`;

        // Grupos: busca direta pelo JID. Individuais: busca pelas variantes do telefone
        const convFilter = isGroup
          ? `contact_phone.eq.${phone},remote_jid.eq.${chatId}`
          : `contact_phone.eq.${phone},contact_phone.eq.${phoneWithout55},contact_phone.eq.${phoneWith55}`;

        let { data: conversation, error: convError } = await supabase
          .from("conversations")
          .select("id, tenant_id, contact_name, contact_avatar")
          .or(convFilter)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const avatarUrl = chatData?.imagePreview || chatData?.image || null;

        // Se o lead ainda não tem chat aberto, cria uma nova conversa automaticamente
        if (!conversation) {
          let customerId: string | null = null;
          let leadName = isGroup
            ? (chatData?.name || senderName || phone)
            : (senderName || chatData?.name || phone);

          if (isGroup) {
            // Grupos: apenas registra a conversa, sem vincular/criar cliente
            console.log(`[webhook] Criando nova conversa de GRUPO jid=${chatId} (${leadName})`);
          } else {
            console.log(`[webhook] Criando nova conversa para lead phone=${phone} (${senderName || "Lead"})`);

            const { data: customer } = await supabase
              .from("customers")
              .select("id, name, tenant_id")
              .or(`phone.ilike.%${phoneWithout55}%,mobile.ilike.%${phoneWithout55}%`)
              .limit(1)
              .maybeSingle();

            if (customer) {
              customerId = customer.id;
              if (customer.name) leadName = customer.name;
              if (!connectionTenantId && customer.tenant_id) connectionTenantId = customer.tenant_id;
            } else if (connectionTenantId) {
              // Auto-cria cliente para o novo lead
              const customerName = senderName || chatData?.name || phone;
              const { data: newCustomer, error: custError } = await supabase
                .from("customers")
                .insert({
                  tenant_id: connectionTenantId,
                  name: customerName,
                  mobile: phoneWith55,
                })
                .select("id")
                .single();

              if (newCustomer && !custError) {
                customerId = newCustomer.id;
                leadName = customerName;
                console.log(`[webhook] Cliente auto-criado: id=${newCustomer.id} name=${customerName} phone=${phoneWith55}`);
              } else if (custError) {
                console.warn(`[webhook] Falha ao auto-criar cliente para ${phone}:`, custError.message);
              }
            }
          }

          const { data: newConv, error: createError } = await supabase
            .from("conversations")
            .insert({
              tenant_id: connectionTenantId,
              contact_phone: phone,
              contact_name: leadName,
              contact_avatar: avatarUrl,
              customer_id: customerId,
              unread_count: 0,
              status: "open",
              last_message_at: timestamp,
              last_message: content ? content.substring(0, 100) : null,
              is_group: isGroup,
              remote_jid: chatId,
              connection_id: connectionId,
            })
            .select("id, tenant_id, contact_name, unread_count")
            .single();

          if (createError || !newConv) {
            console.error(`[webhook] Erro ao criar conversa para ${isGroup ? "grupo" : "lead"} ${phone}:`, createError?.message);
            if (convError) console.warn(`[webhook] DB error anterior:`, convError.message);
            continue;
          }

          conversation = newConv;
        } else if (avatarUrl && avatarUrl !== conversation.contact_avatar) {
          // Atualiza avatar do lead apenas se mudou (evita update por mensagem)
          await supabase
            .from("conversations")
            .update({ contact_avatar: avatarUrl })
            .eq("id", conversation.id);
        }

        if (msg.messageType === "reaction" || msg.reaction) {
          const reactionEmoji = msg.text || msg.reaction || "";
          const reactedToId = msg.reaction || msg.quoted || "";

          if (reactedToId) {
            await supabase
              .from("messages")
              .update({ reaction: reactionEmoji })
              .eq("wa_message_id", reactedToId)
              .eq("conversation_id", conversation.id);
          }
          continue;
        }

        // Auto-download de mídia usando a API do UazAPI
        let mediaUrl: string | null = (msg as any).fileURL || null;
        if (!mediaUrl && mediaType && instanceToken && waMessageId) {
          try {
            const dlRes = await fetch(`https://${uazapiSubdomain}.uazapi.com/message/download`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "token": instanceToken,
              },
              body: JSON.stringify({
                id: waMessageId,
                return_link: true,
              }),
            });
            if (dlRes.ok) {
              const dlData = await dlRes.json();
              if (dlData?.fileURL) {
                mediaUrl = dlData.fileURL;
              }
            }
          } catch (dlErr) {
            console.warn(`[webhook] Falha no download de mídia (${waMessageId}):`, dlErr);
          }
        }

        const insertResult = await supabase.from("messages").insert({
          conversation_id: conversation.id,
          tenant_id: conversation.tenant_id,
          contact_phone: phone,
          content: content,
          direction: "inbound",
          read: false,
          status: "delivered",
          wa_message_id: waMessageId,
          wa_chat_id: chatId,
          reply_to: msg.quoted || null,
          media_type: mediaType,
          media_url: mediaUrl,
          created_at: timestamp,
        });

        if (insertResult.error) {
          // 23505 = duplicada — dedup atômico pelo índice único em wa_message_id
          if (insertResult.error.code === "23505") continue;
          console.error(`[webhook] Erro ao inserir mensagem (waId=${waMessageId}):`, insertResult.error.message);
          continue;
        }

        console.log(`[webhook] Mensagem inserida: waId=${waMessageId} phone=${phone} type=${rawType}`);

        // Update único e atômico: não lidas + last_message (se mais recente)
        const { error: bumpError } = await supabase.rpc("bump_conversation", {
          p_conv_id: conversation.id,
          p_last_at: timestamp,
          p_last_message: content ? content.substring(0, 100) : null,
        });

        if (bumpError) console.error(`[webhook] Erro ao atualizar conversa:`, bumpError.message);

        // Dispara o agente de IA quando o canal está com IA ativa (recurso desacoplado do canal)
        if (aiEnabled && !isGroup) {
          const trigger = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-agent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ conversation_id: conversation.id }),
          })
            .then((r) => r.text())
            .catch((e) => console.warn("[webhook] ai-agent trigger failed:", (e as Error)?.message));
          if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
            EdgeRuntime.waitUntil(trigger);
          } else {
            void trigger;
          }
        }
      }
    }

    // ── messages_update ──
    if (eventType === "messages_update") {
      // Uazapi envia: { event: { MessageIDs: [...], Type: "Read", ... } }
      // ou { data: { ... } }
      const updateData = body?.event || body?.data || body;
      const messageIds = updateData?.MessageIDs || (updateData?.id ? [updateData.id] : []);
      const newStatus = updateData?.Type || updateData?.type || updateData?.status || "";

      for (const waMessageId of messageIds) {
        if (!waMessageId) continue;

        let dbStatus = "sent";
        if (newStatus === "Delivered" || newStatus === "delivered") dbStatus = "delivered";
        else if (newStatus === "Read" || newStatus === "read") dbStatus = "read";
        else if (newStatus === "Sent" || newStatus === "sent") dbStatus = "sent";
        else if (newStatus === "Failed" || newStatus === "error") dbStatus = "error";

        await supabase
          .from("messages")
          .update({ status: dbStatus })
          .eq("wa_message_id", waMessageId);
      }
    }

    // ── connection ──
    if (eventType === "connection") {
      const state = body?.state || body?.status || body?.data?.state;

      if (instanceName && state) {
        let connStatus = "disconnected";
        if (state === "connected" || state === "open") connStatus = "connected";
        else if (state === "connecting") connStatus = "waiting";

        await supabase
          .from("connections")
          .update({ status: connStatus, updated_at: new Date().toISOString() })
          .eq("instance_name", instanceName);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ ok: true, error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
