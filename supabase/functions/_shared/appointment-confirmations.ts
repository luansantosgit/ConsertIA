// Confirmação automática de agendamentos (Issue #22)
// Chamado pelo worker process-scheduled-messages (pg_cron a cada 30s).

function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm ?? "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function tzNow(tz: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour").padStart(2, "0")}:${get("minute")}`,
  };
}

/** Pergunta final adaptada ao tipo do agendamento, evitando "comparecimento" para entregas etc. */
const CONFIRMATION_ASK: Record<string, string> = {
  os: "Podemos confirmar seu comparecimento?",
  delivery: "Podemos confirmar a entrega?",
  meeting: "Podemos confirmar sua presença?",
  reminder: "Podemos confirmar?",
  other: "Podemos confirmar?",
};

function confirmationQuestion(type: string | null | undefined): string {
  return CONFIRMATION_ASK[type ?? "other"] ?? "Podemos confirmar?";
}

async function findConversation(supabase: any, ev: Record<string, any>) {
  if (ev.os_id) {
    const { data: so } = await supabase
      .from("service_orders")
      .select("customer_id")
      .eq("id", ev.os_id)
      .eq("tenant_id", ev.tenant_id)
      .maybeSingle();
    if (so?.customer_id) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, contact_phone, contact_name")
        .eq("tenant_id", ev.tenant_id)
        .eq("customer_id", so.customer_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (conv) return conv;
    }
  }
  if (ev.customer) {
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, contact_phone, contact_name")
      .eq("tenant_id", ev.tenant_id)
      .eq("contact_name", ev.customer)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (conv) return conv;
  }
  return null;
}

export async function processAppointmentConfirmations(supabase: any, baseUrl: string): Promise<number> {
  const { data: tenants } = await supabase
    .from("tenant_settings")
    .select("tenant_id, schedule_confirmation_hours, timezone")
    .not("schedule_confirmation_hours", "is", null)
    .gt("schedule_confirmation_hours", 0);
  if (!tenants?.length) return 0;

  let sent = 0;

  for (const ts of tenants) {
    const tz = ts.timezone || "America/Sao_Paulo";
    const hours = Number(ts.schedule_confirmation_hours) || 0;
    if (hours <= 0) continue;

    const now = tzNow(tz);
    const nowDate = new Date(`${now.date}T00:00:00Z`);
    const dateTo = new Date(nowDate.getTime() + (hours * 60 + 1440) * 60_000).toISOString().slice(0, 10);

    const { data: events } = await supabase
      .from("calendar_events")
      .select("id, tenant_id, title, customer, date, start_time, os_id, type, status, confirmation_asked_at")
      .eq("tenant_id", ts.tenant_id)
      .in("status", ["scheduled", "rescheduled"])
      .is("confirmation_asked_at", null)
      .gte("date", now.date)
      .lte("date", dateTo)
      .limit(50);
    if (!events?.length) continue;

    const { data: conn } = await supabase
      .from("connections")
      .select("id, instance_token")
      .eq("tenant_id", ts.tenant_id)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();
    if (!conn?.instance_token) continue;

    const nowMinutes = toMinutes(now.time);

    for (const ev of events) {
      const evMinutes = Math.round((new Date(`${ev.date}T00:00:00Z`).getTime() - nowDate.getTime()) / 60_000) + toMinutes(ev.start_time);
      const diffMin = evMinutes - nowMinutes;
      if (diffMin < 0 || diffMin > hours * 60) continue;

      const conv = await findConversation(supabase, ev);
      if (!conv) continue;

      const firstName = (conv.contact_name || ev.customer || "").split(" ")[0];
      const time = String(ev.start_time).slice(0, 5);
      const tomorrowDate = new Date(nowDate.getTime() + 86_400_000).toISOString().slice(0, 10);
      const [, m, d] = ev.date.split("-");
      const whenText = ev.date === now.date
        ? `hoje às ${time}`
        : ev.date === tomorrowDate
          ? `amanhã às ${time}`
          : `${d}/${m} às ${time}`;
      const text = `Olá${firstName ? ` ${firstName}` : ""}! Você tem um agendamento de "${ev.title}" para ${whenText}. ${confirmationQuestion(ev.type)} 😊`;

      const resp = await fetch(`${baseUrl}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: conn.instance_token },
        body: JSON.stringify({ number: conv.contact_phone, text }),
      });
      if (!resp.ok) continue;

      await supabase.from("messages").insert({
        conversation_id: conv.id,
        tenant_id: ev.tenant_id,
        contact_phone: conv.contact_phone,
        content: text,
        direction: "outbound",
        read: true,
        status: "sent",
        sender_type: "ai",
      });
      await supabase
        .from("conversations")
        .update({ last_message: text.substring(0, 100), last_message_at: new Date().toISOString() })
        .eq("id", conv.id);
      await supabase
        .from("calendar_events")
        .update({ confirmation_asked_at: new Date().toISOString() })
        .eq("id", ev.id);

      sent++;
    }
  }

  return sent;
}
