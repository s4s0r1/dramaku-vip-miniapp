import { NextRequest, NextResponse } from "next/server";

type DramsiItem = {
  id?: string;
  title?: string;
  synopsis?: string;
  categoryNames?: string[];
  episodes?: number;
  cover?: string;
};

type DramsiResponse = {
  status?: boolean;
  result?: {
    items?: DramsiItem[];
  };
  message?: string;
};

const DRAMSI_BASE_URL = process.env.DRAMSI_BASE_URL ?? "http://localhost:5000";

function mapItem(item: DramsiItem, index: number) {
  return {
    id: Number(item.id ?? index + 1),
    title: item.title || "Tanpa Judul",
    genre: (item.categoryNames && item.categoryNames.length > 0)
      ? item.categoryNames.slice(0, 2).join(" • ")
      : "Drama",
    year: new Date().getFullYear().toString(),
    episodes: Number(item.episodes ?? 0),
    rating: 4.7,
    isVip: true,
    image: item.cover || "",
    synopsis: item.synopsis || "Sinopsis belum tersedia.",
  };
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const upstream = q
      ? `${DRAMSI_BASE_URL}/dramanova/search?q=${encodeURIComponent(q)}&lang=in`
      : `${DRAMSI_BASE_URL}/dramanova/dramas?lang=in&page=1&size=20`;

    const response = await fetch(upstream, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: `Upstream error ${response.status}`, items: [] },
        { status: 502 }
      );
    }

    const json = (await response.json()) as DramsiResponse;
    const items = Array.isArray(json?.result?.items)
      ? json.result.items.map(mapItem)
      : [];

    if (!json?.status) {
      return NextResponse.json(
        { ok: false, message: json?.message ?? "Data drama belum tersedia", items: [] },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Gagal mengambil data drama", items: [] },
      { status: 500 }
    );
  }
}
