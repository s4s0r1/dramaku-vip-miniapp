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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params.id;
    const lang = req.nextUrl.searchParams.get("lang") ?? "in";

    const upstream = `${DRAMSI_BASE_URL}/dramanova/detail?id=${encodeURIComponent(id)}&lang=${encodeURIComponent(lang)}`;
    const response = await fetch(upstream, {
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

    return NextResponse.json({ ok: true, data: json.result.data });
  } catch {
    return NextResponse.json({ ok: false, message: "Gagal mengambil detail drama" }, { status: 500 });
  }
}
