const corsHeaders = (request, env) => {
  const origin = request.headers.get("Origin");

  return {
    "Access-Control-Allow-Origin":
      env.ALLOWED_ORIGIN || origin || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
};

const jsonResponse = (data, status, headers) => {
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
};

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers,
      });
    }

    // Only POST is allowed
    if (request.method !== "POST") {
      return jsonResponse(
        { error: "Method not allowed." },
        405,
        headers
      );
    }

    try {
      const body = await request.json();

      const name =
        typeof body.name === "string"
          ? body.name.trim()
          : "";

      const description =
        typeof body.description === "string"
          ? body.description.trim()
          : "";

      // Validate input
      if (!name || !description) {
        return jsonResponse(
          {
            error: "Name and description are required.",
          },
          400,
          headers
        );
      }

      if (name.length > 120) {
        return jsonResponse(
          {
            error: "Name must be 120 characters or fewer.",
          },
          400,
          headers
        );
      }

      if (description.length > 2000) {
        return jsonResponse(
          {
            error: "Description must be 2000 characters or fewer.",
          },
          400,
          headers
        );
      }

      // Send email through Cloudflare Email Service
      const result = await env.EMAIL.send({
        from: env.EMAIL_FROM,
        to: env.EMAIL_TO,
        subject: `New opportunity submission: ${name}`,

        text: [
          "New opportunity submission",
          "",
          `Name: ${name}`,
          "",
          "Description:",
          description,
        ].join("\n"),

        html: `
          <h2>New opportunity submission</h2>

          <p>
            <strong>Name:</strong><br>
            ${escapeHtml(name)}
          </p>

          <p>
            <strong>Description:</strong>
          </p>

          <p>
            ${escapeHtml(description).replace(/\n/g, "<br>")}
          </p>
        `,
      });

      return jsonResponse(
        {
          ok: true,
          messageId: result.messageId,
        },
        200,
        headers
      );
    } catch (error) {
      console.error(
        "Email sending failed:",
        error?.code,
        error?.message
      );

      switch (error?.code) {
        case "E_SENDER_NOT_VERIFIED":
          return jsonResponse(
            {
              error: "The sender email domain has not been verified.",
            },
            400,
            headers
          );

        case "E_RECIPIENT_NOT_ALLOWED":
          return jsonResponse(
            {
              error: "The recipient is not allowed by the email binding.",
            },
            400,
            headers
          );

        case "E_RATE_LIMIT_EXCEEDED":
          return jsonResponse(
            {
              error: "Too many emails have been sent. Please try again later.",
            },
            429,
            headers
          );

        case "E_DAILY_LIMIT_EXCEEDED":
          return jsonResponse(
            {
              error: "The daily email sending limit has been reached.",
            },
            429,
            headers
          );

        default:
          return jsonResponse(
            {
              error: "Email delivery failed.",
            },
            502,
            headers
          );
      }
    }
  },
};

/**
 * Prevent user-submitted text from being interpreted as HTML.
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}