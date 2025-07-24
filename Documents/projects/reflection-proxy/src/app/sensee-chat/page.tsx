'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { ImageType } from '@/types';

interface UserMessage {
  role: 'user';
  text: string;
}

interface BotMessage {
  role: 'bot';
  text: string;
  images: ImageType[];
}

type Message = UserMessage | BotMessage;

export default function ChatSearchPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (hasMounted.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      hasMounted.current = true;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', text: input }]);
    setLoading(true);
    try {
      const res = await fetch('/api/reflection-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shared-secret': process.env.NEXT_PUBLIC_SHARED_SECRET!,
        },
        body: JSON.stringify({ question: input }),
      });

      const data = await res.json();
      const content = data.reply ?? '返答がありませんでした。';
      const images = data.images ?? [];

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: content,
          images,
        },
      ]);
    } catch (error) {
      console.error('APIエラー:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: '申し訳ありません。検索に失敗しました。', images: [] },
      ]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <main className="max-w-[1040px] mx-auto px-4 py-16 space-y-10 font-sans">
      <h1 className="pt-[80px] -mt-[80px] text-2xl font-bold font-rounded text-gray-800">
        Sensee AI / ベータ版
      </h1>

      <section className="bg-[#F6F4EB] p-6 rounded-2xl shadow-card space-y-6">
        <h2 className="text-lg font-bold font-rounded text-gray-800">お気軽にお問い合わせください！</h2>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
          わからないことがあれば、すぐ聞いてくださいね。
        </p>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
          Sensee AIが、画像の探し方や使い方をお手伝いします。
        </p>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
          このページの下にあるチャット欄から、いつでも質問できます。
        </p>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
          例えば「この画像どこ？」「夏のプリントに使えるイラストある？」など、あいまいなニュアンスでも検索できます。
        </p>
      </section>

      <section className="bg-[#F9FAFB] p-6 rounded-2xl shadow-card space-y-6">
        <h2 className="text-lg font-bold font-rounded text-gray-800">Sensee AI</h2>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
          ベータ版のため少し画像検索に時間がかかる場合があります。気長に待ってね♪
        </p>
        <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
          検索しても思った画像がなかったらリクエストお待ちしています！
        </p>

        <div className="min-h-[300px] max-h-[500px] overflow-y-auto mb-4 space-y-6 bg-[#F0F8F8] p-4 rounded">
          {messages.map((msg, i) => (
            <div key={i} className={`space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              {msg.role === 'bot' && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Image
                    src="/images/sensee_icon.webp"
                    alt="センシーくん"
                    width={20}
                    height={20}
                    className="rounded-full object-contain"
                  />
                  <span>Sensee AI</span>
                </div>
              )}
              <div
                className={`inline-block ${msg.role === 'user' ? 'max-w-[60%] ml-auto bg-blue-600 text-white' : 'max-w-full bg-white text-gray-900'} p-3 rounded-lg shadow`}
              >
                <p>{msg.text}</p>
                {msg.role === 'bot' && msg.images.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {msg.images.map((img) => (
                      <Link href={`/images/${img.id}`} key={img.id} className="block">
                        <Image
                          src={img.image.url}
                          alt={img.title}
                          width={img.image.width}
                          height={img.image.height}
                          className="rounded object-contain w-full h-auto"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            className="flex-grow rounded-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white"
            placeholder="探したい画像のニュアンスを入力してみてください。"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoComplete="off"
            inputMode="text"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? '検索中...' : '送信'}
          </button>
        </form>
      </section>
    </main>
  );
}
