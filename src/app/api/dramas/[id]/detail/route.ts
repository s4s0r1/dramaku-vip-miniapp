import { NextRequest, NextResponse } from "next/server";

const DRAMSI_BASE_URL = process.env.DRAMSI_BASE_URL ?? "http://localhost:5000";

type DramsiDetailEpisode = {
  episode?: number;
  title?: string;
  free?: boolean;
  locked?: boolean;
};

type DramsiDetailData = {
  id?: string;
  title?: string;
  synopsis?: string;
  cover?: string;
  totalEpisodes?: number;
  episodes?: DramsiDetailEpisode[];
};

type DramsiResponse = {
  status?: boolean;
  result?: {
    data?: DramsiDetailData;
  };
  message?: string;
};

function splitSourceId(raw: string): { source: string; id: string } {
  const [source, ...rest] = raw.split(":");
  if (!source || rest.length === 0) return { source: "dramabite", id: raw };
  return { source, id: rest.join(":") };
}

function normalizeDetail(data: DramsiDetailData): DramsiDetailData {
  const episodes = Array.isArray(data.episodes)
    ? data.episodes.map((ep, idx) => ({
        episode: Number(ep.episode ?? idx + 1),
        title: ep.title || `Episode ${idx + 1}`,
        free: Boolean(ep.free),
        locked: Boolean(ep.locked),
      }))
    : [];

  return {
    id: String(data.id ?? ""),
    title: data.title || "Tanpa Judul",
    synopsis: data.synopsis || "Sinopsis belum tersedia.",
    cover: data.cover || "",
    totalEpisodes: Number(data.totalEpisodes ?? episodes.length),
    episodes,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { source, id } = splitSourceId(params.id);
    void req;

    const sourceUrl =
      source === "goodshort"
        ? `${DRAMSI_BASE_URL}/goodshort/detail?id=${encodeURIComponent(id)}`
        : `${DRAMSI_BASE_URL}/dramabite/detail?id=${encodeURIComponent(id)}&lang=id`;

    const response = await fetch(sourceUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, message: `Upstream error ${response.status}` }, { status: 502 });
    }

    const json = (await response.json()) as DramsiResponse;
    if (!json?.status || !json?.result?.data) {
      return NextResponse.json({ ok: false, message: json?.message ?? "Detail drama tidak tersedia" }, { status: 422 });
    }

    return NextResponse.json({ ok: true, source, data: normalizeDetail(json.result.data) });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal mengambil detail drama" }, { status: 500 });
  }
}
