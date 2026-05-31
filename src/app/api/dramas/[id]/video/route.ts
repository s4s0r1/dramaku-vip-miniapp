import { NextRequest, NextResponse } from "next/server";

const DRAMSI_BASE_URL = process.env.DRAMSI_BASE_URL ?? "http://localhost:5000";

type DramsiVideoData = {
  videoUrl?: string;
  episode?: number;
  epTitle?: string;
  qualityList?: Array<{ label?: string; url?: string }>;
  subtitles?: Array<{ label?: string; lang?: string; proxiedUrl?: string; url?: string }>;
};

type DramsiResponse = {
  status?: boolean;
  result?: DramsiVideoData;
  message?: string;
};

function splitSourceId(raw: string): { source: string; id: string } {
  const [source, ...rest] = raw.split(":");
  if (!source || rest.length === 0) return { source: "dramabite", id: raw };
  return { source, id: rest.join(":") };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { source, id } = splitSourceId(params.id);
    const ep = req.nextUrl.searchParams.get("ep") ?? "1";

    const sourceUrl =
      source === "goodshort"
        ? `${DRAMSI_BASE_URL}/goodshort/stream?id=${encodeURIComponent(id)}&ep=${encodeURIComponent(ep)}&quality=720p`
        : `${DRAMSI_BASE_URL}/dramabite/episode?id=${encodeURIComponent(id)}&ep=${encodeURIComponent(ep)}&lang=id&quality=default`;

    const response = await fetch(sourceUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ ok: false, message: `Upstream error ${response.status}` }, { status: 502 });
    }

    const json = (await response.json()) as DramsiResponse;
    if (!json?.status || !json?.result?.videoUrl) {
      return NextResponse.json({ ok: false, message: json?.message ?? "Video episode tidak tersedia" }, { status: 422 });
    }

    const subtitles = Array.isArray(json.result.subtitles)
      ? json.result.subtitles.map((sub) => {
          const raw = sub.proxiedUrl || sub.url || "";
          const absoluteUrl =
            raw.startsWith("http://") || raw.startsWith("https://")
              ? raw
              : `${DRAMSI_BASE_URL}${raw.startsWith("/") ? raw : `/${raw}`}`;
          return {
            label: sub.label || sub.lang || "Subtitle",
            lang: sub.lang || "id",
            url: absoluteUrl,
          };
        })
      : [];

    return NextResponse.json({
      ok: true,
      source,
      data: {
        videoUrl: json.result.videoUrl,
        episode: json.result.episode,
        epTitle: json.result.epTitle,
        qualityList: json.result.qualityList || [],
        subtitles,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal mengambil video episode" }, { status: 500 });
  }
}
