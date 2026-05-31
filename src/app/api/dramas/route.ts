import { NextRequest, NextResponse } from "next/server";

type Provider = "dramabite" | "goodshort";

type DramsiItem = {
  id?: string;
  title?: string;
  synopsis?: string;
  categoryNames?: string[];
  episodes?: number;
  cover?: string;
  viewCount?: number;
};

type DramsiResponse = {
  status?: boolean;
  result?: {
    items?: DramsiItem[];
  };
};

const DRAMSI_BASE_URL = process.env.DRAMSI_BASE_URL ?? "http://localhost:5000";

const fallbackItems = [
  {
    id: "fallback:9001",
    title: "Cinta di Istana Awan",
    genre: "Romantis • Kostum",
    year: new Date().getFullYear().toString(),
    episodes: 36,
    rating: 4.8,
    isVip: true,
    image:
      "https://images.unsplash.com/photo-1520975682031-a59f7a996af3?auto=format&fit=crop&w=800&q=80",
    synopsis:
      "Putri dari kerajaan kecil bertemu pangeran dingin dari negeri seberang.",
  },
];

function mapItem(item: DramsiItem, index: number, source: Provider) {
  const id = String(item.id ?? index + 1);
  return {
    id: `${source}:${id}`,
    title: item.title || "Tanpa Judul",
    genre:
      item.categoryNames && item.categoryNames.length > 0
        ? item.categoryNames.slice(0, 2).join(" • ")
        : "Drama",
    year: new Date().getFullYear().toString(),
    episodes: Number(item.episodes ?? 0),
    rating: item.viewCount && item.viewCount > 0 ? 4.8 : 4.7,
    isVip: true,
    image: item.cover || "",
    synopsis: item.synopsis || "Sinopsis belum tersedia.",
  };
}

async function fetchItems(url: string): Promise<DramsiItem[]> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const json = (await response.json()) as DramsiResponse;
    if (!json?.status || !Array.isArray(json?.result?.items)) return [];
    return json.result.items;
  } catch {
    return [];
  }
}

async function fetchItemsMulti(urlFactory: (page: number) => string, pages: number): Promise<DramsiItem[]> {
  const tasks: Array<Promise<DramsiItem[]>> = [];
  for (let page = 0; page < pages; page += 1) {
    tasks.push(fetchItems(urlFactory(page)));
  }
  const results = await Promise.all(tasks);
  return results.flat();
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const category = req.nextUrl.searchParams.get("category")?.trim() ?? "Sedang Trending";

    const batches = q
      ? await Promise.all([
          fetchItems(`${DRAMSI_BASE_URL}/dramabite/search?q=${encodeURIComponent(q)}&lang=id&limit=80`),
          fetchItems(`${DRAMSI_BASE_URL}/goodshort/search?q=${encodeURIComponent(q)}&page=1`),
          fetchItems(`${DRAMSI_BASE_URL}/goodshort/search?q=${encodeURIComponent(q)}&page=2`),
        ])
      : category === "Rilis Baru"
        ? await Promise.all([
            fetchItems(`${DRAMSI_BASE_URL}/dramabite/dramas?lang=id&page=0`),
            fetchItems(`${DRAMSI_BASE_URL}/dramabite/dramas?lang=id&page=1`),
          ])
        : category === "Untuk Kamu"
          ? await Promise.all([
              fetchItems(`${DRAMSI_BASE_URL}/dramabite/foryou?lang=id&page=0`),
              fetchItems(`${DRAMSI_BASE_URL}/dramabite/recommend?lang=id&page=0`),
              fetchItems(`${DRAMSI_BASE_URL}/goodshort/home?page=3&channel=id`),
            ])
          : category === "Semua"
            ? await Promise.all([
                fetchItemsMulti(
                  (page) => `${DRAMSI_BASE_URL}/dramabite/dramas?lang=id&page=${page}`,
                  8
                ),
                fetchItems(`${DRAMSI_BASE_URL}/dramabite/foryou?lang=id&page=0`),
                fetchItems(`${DRAMSI_BASE_URL}/dramabite/recommend?lang=id&page=0`),
                fetchItems(`${DRAMSI_BASE_URL}/dramabite/hot?lang=id`),
                fetchItemsMulti(
                  (pageOffset) =>
                    `${DRAMSI_BASE_URL}/goodshort/home?page=${pageOffset + 1}&channel=id`,
                  8
                ),
              ])
          : await Promise.all([
              fetchItems(`${DRAMSI_BASE_URL}/dramabite/hot?lang=id`),
              fetchItems(`${DRAMSI_BASE_URL}/dramabite/recommend?lang=id&page=0`),
              fetchItems(`${DRAMSI_BASE_URL}/goodshort/home?page=1&channel=id`),
            ]);

    const tagged: Array<{ source: Provider; item: DramsiItem }> = [];

    if (q) {
      const [qb, qc1, qc2] = batches as DramsiItem[][];
      qb.forEach((item) => tagged.push({ source: "dramabite", item }));
      qc1.forEach((item) => tagged.push({ source: "goodshort", item }));
      qc2.forEach((item) => tagged.push({ source: "goodshort", item }));
    } else {
      const dynamic = batches as DramsiItem[][];
      dynamic.forEach((arr, idx) => {
        const source: Provider = idx <= 1 ? "dramabite" : "goodshort";
        arr.forEach((item) => tagged.push({ source, item }));
      });
    }

    const unique = new Map<string, { source: Provider; item: DramsiItem }>();
    tagged.forEach(({ source, item }) => {
      const id = String(item.id ?? "");
      if (!id) return;
      const key = `${source}:${id}`;
      if (!unique.has(key)) unique.set(key, { source, item });
    });

    const items = Array.from(unique.values()).map(({ source, item }, idx) => mapItem(item, idx, source));
    if (items.length > 0) {
      return NextResponse.json({ ok: true, source: "dramsi", total: items.length, items });
    }

    return NextResponse.json({ ok: true, source: "fallback", items: fallbackItems });
  } catch {
    return NextResponse.json({ ok: true, source: "fallback", items: fallbackItems });
  }
}
