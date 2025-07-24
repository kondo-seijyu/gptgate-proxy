import { createMicroCMSClient } from './client';
import type { ImageType } from '../types/index';
import { OpenAI } from 'openai';

const tagList = [
  { id: 'transparent', label: '透過済み' },
  { id: 'musical-instrument', label: '楽器' },
  { id: 'piano', label: 'ピアノ' },
  { id: 'birthday', label: '誕生日' },
  { id: 'sweets', label: 'お菓子' },
  { id: 'sports-day', label: '運動会' },
  { id: 'presentation', label: '発表会' },
  { id: 'cultural-festival', label: '文化祭' },
  { id: 'swimming', label: '水泳' },
  { id: 'pool', label: 'プール' },
  { id: 'injury', label: '怪我' },
  { id: 'cold', label: '風邪' },
  { id: 'physical-condition', label: '体調' },
  { id: 'tag', label: '鬼ごっこ' },
  { id: 'dodgeball', label: 'ドッジボール' },
  { id: 'baseball', label: '野球' },
  { id: 'soccer', label: 'サッカー' },
  { id: 'sports', label: 'スポーツ' },
  { id: 'frame', label: 'フレーム' },
  { id: 'music', label: '音楽' },
  { id: 'physical-education', label: '体育' },
  { id: 'english', label: '英語' },
  { id: 'graduation-ceremony', label: '卒業式' },
  { id: 'print', label: 'プリント' },
  { id: 'line', label: 'LINE' },
  { id: 'animals', label: '動物' },
  { id: 'uniform', label: '制服' },
  { id: 'student', label: '生徒' },
  { id: 'teacher', label: '先生' },
  { id: 'test', label: 'テスト' },
  { id: 'programming', label: 'プログラミング' },
  { id: 'school-lunch', label: '給食' },
  { id: 'tablet', label: 'タブレット' },
  { id: 'smartphone', label: 'スマートフォン' },
  { id: 'pc', label: 'パソコン' },
  { id: 'stationery', label: '文房具' },
  { id: 'equipment', label: '備品' },
  { id: 'entrance-ceremony', label: '入学式' },
  { id: 'spring-break', label: '春休み' },
  { id: 'summer-vacation', label: '夏休み' },
  { id: 'autumn-holidays', label: '秋休み' },
  { id: 'winter-holidays', label: '冬休み' },
  { id: 'evacuation-drill', label: '避難訓練' },
  { id: 'firework', label: '花火' },
  { id: 'christmas', label: 'クリスマス' },
  { id: 'new-year', label: '正月' },
  { id: 'kindergarten-student', label: '園児' },
  { id: 'nursery-school', label: '保育園' },
  { id: 'excursion', label: '遠足' },
  { id: 'winter', label: '冬' },
  { id: 'autumn', label: '秋' },
  { id: 'spring', label: '春' },
  { id: 'summer', label: '夏' },
  { id: 'kindergarten', label: '幼稚園' },
  { id: 'science', label: '理科' },
  { id: 'society', label: '社会' },
  { id: 'math', label: '数学' },
  { id: 'arithmetic', label: '算数' },
  { id: 'japanese', label: '国語' },
  { id: 'seat-change', label: '席替え' },
  { id: 'cherry-blossoms', label: '桜' },
];

export async function handleChatToTags(
  question: string,
  env: { OPENAI_API_KEY: string }
): Promise<{ id: string; label: string }[]> {
  console.log('[handleChatToTags] 入力:', question);

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const systemPrompt = `以下は画像のタグ一覧です。\n\n${tagList.map((tag) => `${tag.label}: ${tag.id}`).join('\n')}\n\nユーザーの質問に関連するラベル（日本語）を複数選び、JSON形式で返してください（例: {"tags": ["誕生日", "花火"]）`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    response_format: { type: 'json_object' },
  });

  console.log('[handleChatToTags] OpenAI応答:', completion.choices[0].message.content);

  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  const matchedLabels = Array.isArray(parsed.tags)
    ? parsed.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
    : [];

  return tagList.filter((tag) => matchedLabels.includes(tag.label));
}

export async function fetchImagesByTagsOrKeywords(
  tags: { id: string; label: string }[],
  keyword: string,
  env: { MICROCMS_SERVICE_DOMAIN: string; MICROCMS_API_KEY: string }
): Promise<ImageType[]> {
  console.log('[fetchImagesByTagsOrKeywords] 入力:', { tags, keyword });

  const client = createMicroCMSClient(env);

  const tagFilter = tags.length
    ? `(${tags.map((tag) => `tags[contains]${tag.id}`).join('[or]')})`
    : '';

  const labelFilters = tags.map((l) => l.label);
  const keywordFilter = `(${['title', 'description', 'category']
    .map((field) => labelFilters.map((l) => `${field}[contains]${l}`).join('[or]'))
    .join('[or]')}[or](${['title', 'description', 'category']
      .map((field) => `${field}[contains]${keyword}`)
      .join('[or]')}))`;

  const finalFilter = tagFilter ? `(${tagFilter}[or]${keywordFilter})` : keywordFilter;

  console.log('[fetchImagesByTagsOrKeywords] フィルター:', finalFilter);

  const data = await client.get({
    endpoint: 'images',
    queries: {
      filters: finalFilter,
      limit: 20,
    },
  });

  console.log('[fetchImagesByTagsOrKeywords] MicroCMSレスポンス:', data);

  return data.contents;
}