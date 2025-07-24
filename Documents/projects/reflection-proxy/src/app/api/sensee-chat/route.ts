import { NextResponse } from 'next/server';
import { handleChatToTags, fetchImagesByTagsOrKeywords } from '../../../lib/logic';;

export async function POST(req: Request) {
  const secret = req.headers.get('x-shared-secret');
  if (secret !== process.env.SHARED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { question } = body;

  if (!question) {
    return NextResponse.json({ reply: '質問が見つかりませんでした。', images: [] }, { status: 400 });
  }

  try {
    const matchedTags = await handleChatToTags(question, {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    });

    const images = await fetchImagesByTagsOrKeywords(matchedTags, question, {
      MICROCMS_SERVICE_DOMAIN: process.env.MICROCMS_SERVICE_DOMAIN!,
      MICROCMS_API_KEY: process.env.MICROCMS_API_KEY!,
    });

    const replyText = images.length
      ? `こちらの画像が見つかりました！`
      : `すみません、該当する画像が見つかりませんでした。`;

    return NextResponse.json({ reply: replyText, images });
  } catch (err) {
    console.error('[API Error]', err);
    return NextResponse.json({ reply: '検索中にエラーが発生しました。', images: [] }, { status: 500 });
  }
}