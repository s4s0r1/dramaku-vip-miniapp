import { NextRequest, NextResponse } from "next/server";

const DRAMSI_BASE_URL = process.env.DRAMSI_BASE_URL ?? "http://localhost:5000";

type DramsiVideoData = {
  videoUrl?: string;
  episode?: number;
  epTitle?: string;
  qualityList?: Array<{ label?: string; url?: string }>;
};

type DramsiResponse = {
  status?: boolean;
  result?: DramsiVideoData;
  message?: string;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params.id;
    const ep = req.nextUrl.searchParams.get("ep") ?? "1";
    const lang = req.nextUrl.searchParams.get("lang") ?? "in";

    const upstream = `${DRAMSI_BASE_URL}/dramanova/video?id=${encodeURIComponent(id)}&ep=${encodeURIComponent(ep)}&lang=${encodeURIComponent(lang)}`;
    const response = await fetch(upstream, {
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

    return NextResponse.json({ ok: true, data: json.result });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal mengambil video episode" }, { status: 500 });
  }
}
