export async function POST(req: Request) {
  const { prompt, temperature } = await req.json()

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
    }),
  })

  return new Response(res.body, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  })
}