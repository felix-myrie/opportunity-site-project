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

const response = (data, status, headers) => {
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
};

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
      });
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

      if (!name || !description) {
        return new Response(
          JSON.stringify({
            error: "Name and description are required.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Save the submission to D1
      const result = await env.opportunities
        .prepare(`
          INSERT INTO opportunities
            (name, description)
          VALUES
            (?, ?)
        `)
        .bind(name, description)
        .run();

      return new Response(
        JSON.stringify({
          ok: true,
          id: result.meta.last_row_id,
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          error: "Unable to save submission.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  },
};