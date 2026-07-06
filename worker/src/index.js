// Worker que recibe los datos de una reserva desde reserva.html y envía
// un WhatsApp automático al barbero usando la Meta WhatsApp Cloud API.
//
// Configura estos dos secretos/variables antes de desplegar (ver README):
//   WHATSAPP_TOKEN            -> secreto, con: npx wrangler secret put WHATSAPP_TOKEN
//   WHATSAPP_PHONE_NUMBER_ID  -> variable normal en wrangler.toml ([vars])
//
// El template de WhatsApp debe llamarse "nueva_cita", categoría Utility,
// idioma "es", con este cuerpo (5 variables):
//   Nueva cita reservada.
//   Cliente: {{1}}
//   Servicio: {{2}}
//   Fecha: {{3}} a las {{4}}
//   Teléfono del cliente: {{5}}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== "POST") {
      return json({ error: "Método no permitido" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "JSON inválido" }, 400);
    }

    const { telefonoDestino, nombre, servicio, fecha, hora, telefonoCliente } = body;
    if (!telefonoDestino || !nombre || !servicio || !fecha || !hora) {
      return json({ error: "Faltan datos de la reserva" }, 400);
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: telefonoDestino,
          type: "template",
          template: {
            name: "nueva_cita",
            language: { code: "es" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: nombre },
                  { type: "text", text: servicio },
                  { type: "text", text: fecha },
                  { type: "text", text: hora },
                  { type: "text", text: telefonoCliente || "N/D" },
                ],
              },
            ],
          },
        }),
      }
    );

    const result = await metaRes.json();
    if (!metaRes.ok) {
      return json({ error: "Meta rechazó el envío", detalle: result }, 502);
    }
    return json({ ok: true });
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
