"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Drama = {
  id: string;
  title: string;
  genre: string;
  year: string;
  episodes: number;
  rating: number;
  isVip: boolean;
  image: string;
  synopsis: string;
};

type DramaDetailEpisode = {
  episode: number;
  title: string;
  free: boolean;
  locked: boolean;
};

type DramaDetail = {
  id: string;
  title: string;
  synopsis: string;
  cover: string;
  totalEpisodes: number;
  episodes: DramaDetailEpisode[];
};

type VideoSubtitle = {
  label: string;
  lang: string;
  url: string;
};

type EpisodeVideoData = {
  videoUrl: string;
  episode?: number;
  epTitle?: string;
  subtitles: VideoSubtitle[];
};

const categories = [
  "Semua",
  "Sedang Trending",
  "Rilis Baru",
  "Untuk Kamu",
 ] as const;
type Category = (typeof categories)[number];
type Tab = "home" | "vip" | "request";
type VipPlan = {
  id: string;
  days: number;
  price: number;
  isPopular?: boolean;
  note: string;
};

const vipPlans: VipPlan[] = [
  { id: "vip_1", days: 1, price: 3000, note: "Cocok untuk coba dulu." },
  { id: "vip_5", days: 5, price: 6000, note: "Lebih hemat untuk maraton." },
  {
    id: "vip_7",
    days: 7,
    price: 8000,
    isPopular: true,
    note: "Paling favorit pengguna.",
  },
  { id: "vip_15", days: 15, price: 13000, note: "Buat yang nonton rutin." },
  {
    id: "vip_30",
    days: 30,
    price: 22000,
    note: "Best value, akses paling panjang.",
  },
];

export default function Home() {
  const PAGE_SIZE = 12;
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("Semua");
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestGenre, setRequestGenre] = useState("Romantis");
  const [requestNote, setRequestNote] = useState("");
  const [requestSuccess, setRequestSuccess] = useState<string>("");
  const [selectedVipPlanId, setSelectedVipPlanId] = useState<string>("vip_7");
  const [showQrisModal, setShowQrisModal] = useState<boolean>(false);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [isLoadingDrama, setIsLoadingDrama] = useState<boolean>(false);
  const [dramaError, setDramaError] = useState<string>("");
  const [detailData, setDetailData] = useState<DramaDetail | null>(null);
  const [detailError, setDetailError] = useState<string>("");
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isLoadingVideoEp, setIsLoadingVideoEp] = useState<number | null>(null);
  const [videoData, setVideoData] = useState<EpisodeVideoData | null>(null);
  const [activeSubtitleUrl, setActiveSubtitleUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    const loadDramas = async () => {
      setIsLoadingDrama(true);
      setDramaError("");
      try {
        const endpoint = query.trim()
          ? `/api/dramas?q=${encodeURIComponent(query.trim())}&category=${encodeURIComponent(activeCategory)}`
          : `/api/dramas?category=${encodeURIComponent(activeCategory)}`;
        const response = await fetch(endpoint, { cache: "no-store" });
        const json = await response.json();
        if (cancelled) return;
        if (!json?.ok || !Array.isArray(json?.items)) {
          setDramaError("Data drama belum tersedia.");
          setDramas([]);
          return;
        }
        setDramas(json.items as Drama[]);
        setVisibleCount(PAGE_SIZE);
      } catch {
        if (!cancelled) {
          setDramaError("Gagal memuat drama.");
          setDramas([]);
          setVisibleCount(PAGE_SIZE);
        }
      } finally {
        if (!cancelled) setIsLoadingDrama(false);
      }
    };
    loadDramas();
    return () => {
      cancelled = true;
    };
  }, [query, activeCategory]);

  useEffect(() => {
    let cancelled = false;
    const loadDetail = async () => {
      if (!selectedDrama) {
        setDetailData(null);
        setDetailError("");
        setVideoData(null);
        setActiveSubtitleUrl("");
        return;
      }
      setIsLoadingDetail(true);
      setDetailError("");
      try {
        const response = await fetch(`/api/dramas/${selectedDrama.id}/detail`, {
          cache: "no-store",
        });
        const json = await response.json();
        if (cancelled) return;
        if (!json?.ok || !json?.data) {
          setDetailData(null);
          setDetailError("Detail episode belum tersedia.");
          return;
        }
        const episodes = Array.isArray(json.data.episodes)
          ? json.data.episodes.map((ep: { episode?: number; title?: string; free?: boolean; locked?: boolean }, idx: number) => ({
              episode: Number(ep.episode ?? idx + 1),
              title: ep.title || `Episode ${idx + 1}`,
              free: Boolean(ep.free),
              locked: Boolean(ep.locked),
            }))
          : [];
        setDetailData({
          id: String(json.data.id ?? selectedDrama.id),
          title: json.data.title || selectedDrama.title,
          synopsis: json.data.synopsis || selectedDrama.synopsis,
          cover: json.data.cover || selectedDrama.image,
          totalEpisodes: Number(json.data.totalEpisodes ?? episodes.length),
          episodes,
        });
      } catch {
        if (!cancelled) {
          setDetailData(null);
          setDetailError("Gagal memuat detail drama.");
        }
      } finally {
        if (!cancelled) setIsLoadingDetail(false);
      }
    };
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedDrama]);

  const handleWatchEpisode = async (episode: number) => {
    if (!selectedDrama) return;
    if (episode > 5) {
      alert("Episode ini khusus VIP. Silakan upgrade ke paket VIP terlebih dahulu.");
      setSelectedDrama(null);
      setActiveTab("vip");
      return;
    }
    setIsLoadingVideoEp(episode);
    try {
      const response = await fetch(`/api/dramas/${selectedDrama.id}/video?ep=${episode}`, {
        cache: "no-store",
      });
      const json = await response.json();
      if (!json?.ok || !json?.data?.videoUrl) {
        alert(json?.message || "Video belum tersedia.");
        return;
      }
      const nextVideo: EpisodeVideoData = {
        videoUrl: String(json.data.videoUrl),
        episode: Number(json.data.episode ?? episode),
        epTitle: String(json.data.epTitle ?? `Episode ${episode}`),
        subtitles: Array.isArray(json.data.subtitles)
          ? json.data.subtitles
              .filter((sub: { url?: string }) => Boolean(sub?.url))
              .map((sub: { label?: string; lang?: string; url?: string }) => ({
                label: String(sub.label ?? sub.lang ?? "Subtitle"),
                lang: String(sub.lang ?? "id"),
                url: String(sub.url ?? ""),
              }))
          : [],
      };
      setVideoData(nextVideo);
      setActiveSubtitleUrl(nextVideo.subtitles[0]?.url ?? "");
    } catch {
      alert("Gagal mengambil video episode.");
    } finally {
      setIsLoadingVideoEp(null);
    }
  };

  const adjustSubtitleCues = () => {
    const video = videoRef.current;
    if (!video) return;
    for (const track of Array.from(video.textTracks)) {
      track.mode = "showing";
      const cues = track.cues;
      if (!cues) continue;
      for (let i = 0; i < cues.length; i += 1) {
        const cue = cues[i] as VTTCue;
        if (typeof cue.line !== "undefined") cue.line = -4;
        if (typeof cue.position !== "undefined") cue.position = 50;
      }
    }
  };

  const handleSubmitRequest = () => {
    if (!requestTitle.trim()) {
      alert("Judul request wajib diisi dulu.");
      return;
    }
    setRequestSuccess("Terimakasih, request telah dikirim dan akan diproses secepatnya.");
    setRequestTitle("");
    setRequestGenre("Romantis");
    setRequestNote("");
    setTimeout(() => {
      setRequestSuccess("");
    }, 3000);
  };

  const filteredDramas = dramas;
  const visibleDramas = filteredDramas.slice(0, visibleCount);
  const hasMoreDrama = visibleCount < filteredDramas.length;
  const selectedVipPlan =
    vipPlans.find((plan) => plan.id === selectedVipPlanId) ?? vipPlans[0];

  if (activeTab === "vip") {
    return (
      <main className="min-h-screen bg-[#080A12] text-white">
        <div className="mx-auto max-w-md px-4 pb-24 pt-5">
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#212954] via-[#12172A] to-[#090C16] p-5 shadow-xl">
            <p className="text-xs text-[#DAB970]">Keanggotaan Eksklusif</p>
            <h1 className="mt-1 text-2xl font-bold text-[#F6D58B]">Paket VIP</h1>
            <p className="mt-2 text-sm text-white/70">
              Semua episode VIP terbuka penuh selama masa aktif paket.
            </p>
          </section>

          <div className="mt-5 space-y-3">
            {vipPlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedVipPlanId(plan.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedVipPlanId === plan.id
                    ? "border-cyan-300 bg-cyan-300/10 shadow-lg shadow-cyan-900/20"
                    : plan.isPopular
                    ? "border-[#F6D58B]/60 bg-[#F6D58B]/10 shadow-lg shadow-[#F6D58B]/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/60">VIP {plan.days} Hari</p>
                    <h2 className="mt-1 text-xl font-bold text-white">
                      Rp {plan.price.toLocaleString("id-ID")}
                    </h2>
                    <p className="mt-1 text-sm text-white/60">{plan.note}</p>
                  </div>
                  {plan.isPopular && (
                    <span className="rounded-full bg-[#F6D58B] px-3 py-1 text-xs font-bold text-black">
                      Terlaris
                    </span>
                  )}
                  {selectedVipPlanId === plan.id && (
                    <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-[#04252A]">
                      Dipilih
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowQrisModal(true)}
            className="mt-5 w-full rounded-2xl bg-[#F6D58B] py-3 font-bold text-black"
          >
            Lanjut Pembayaran • VIP {selectedVipPlan.days} Hari
          </button>
          <div className="h-2" />
        </div>

        {showQrisModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101528] p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Pembayaran QRIS</h3>
                <button
                  onClick={() => setShowQrisModal(false)}
                  className="rounded-full border border-white/20 px-2 py-1 text-xs text-white/80"
                >
                  Tutup
                </button>
              </div>
              <p className="mb-3 text-sm text-white/75">
                Silakan scan QRIS berikut untuk melakukan pembelian VIP.
              </p>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white p-2">
                <Image
                  src="/qris.jpg"
                  alt="QRIS Pembayaran VIP"
                  width={800}
                  height={800}
                  className="h-auto w-full rounded-lg"
                />
              </div>
              <p className="mt-3 text-xs text-white/55">
                Paket dipilih: VIP {selectedVipPlan.days} Hari • Rp{" "}
                {selectedVipPlan.price.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        )}

        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </main>
    );
  }

  if (activeTab === "request") {
    return (
      <main className="min-h-screen bg-[#080A12] text-white">
        <div className="mx-auto max-w-md px-4 pb-24 pt-5">
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#22363E] via-[#0E1C24] to-[#091019] p-5 shadow-xl">
            <p className="text-xs text-[#A9DFEE]">Konten Favoritmu</p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Request Film & Drama
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Kirim judul yang kamu cari, tim kami akan proses secepatnya.
            </p>
          </section>

          <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <input
              value={requestTitle}
              onChange={(event) => setRequestTitle(event.target.value)}
              placeholder="Contoh: The Legend of Shen Li"
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-cyan-300"
            />
            <select
              value={requestGenre}
              onChange={(event) => setRequestGenre(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none focus:border-cyan-300"
            >
              <option>Romantis</option>
              <option>Action</option>
              <option>Kostum</option>
              <option>Modern Drama</option>
              <option>Lainnya</option>
            </select>
            <textarea
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              placeholder="Catatan tambahan: tahun rilis, aktor favorit, atau alasan request."
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-cyan-300"
            />
            <button
              onClick={handleSubmitRequest}
              className="w-full rounded-xl bg-cyan-300 py-3 font-bold text-[#0A1B25]"
            >
              Kirim Request
            </button>
            {requestSuccess && (
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/20 px-3 py-2 text-sm text-emerald-100">
                {requestSuccess}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-white/70">Tips request cepat diproses:</p>
            <ul className="mt-2 space-y-1 text-xs text-white/50">
              <li>• Tulis judul sejelas mungkin.</li>
              <li>• Tambahkan genre atau tahun rilis.</li>
              <li>• Gunakan 1 judul per request.</li>
            </ul>
          </div>
        </div>

        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </main>
    );
  }

  if (selectedDrama) {
    return (
      <main className="min-h-screen bg-[#080A12] text-white">
        <div className="mx-auto max-w-md px-4 pb-24 pt-5">
          <button
            onClick={() => setSelectedDrama(null)}
            className="mb-5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
          >
            ← Kembali
          </button>

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-2xl">
            <div
              className="h-72 bg-cover bg-center"
              style={{ backgroundImage: `url(${selectedDrama.image})` }}
            />

            <div className="space-y-5 p-5">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-200">
                  {selectedDrama.genre}
                </div>
                <h1 className="text-2xl font-bold">{selectedDrama.title}</h1>
                <p className="mt-1 text-sm text-white/60">
                  ⭐ {selectedDrama.rating} • {selectedDrama.year} •{" "}
                  {detailData?.totalEpisodes ?? selectedDrama.episodes} Episode
                </p>
              </div>

              <div>
                <h2 className="mb-3 font-semibold">Episode</h2>
                {isLoadingDetail && <p className="text-sm text-white/60">Memuat episode...</p>}
                {!isLoadingDetail && detailError && (
                  <p className="text-sm text-red-300">{detailError}</p>
                )}
                {!isLoadingDetail && !detailError && (
                  <div className="space-y-3">
                    {(detailData?.episodes ?? []).map((episode) => {
                      const isEpisodeFree = episode.episode <= 5;
                      return (
                        <div key={episode.episode} className="space-y-3">
                          {videoData && videoData.episode === episode.episode && (
                            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">
                                  Sedang Diputar:{" "}
                                  {videoData.epTitle ?? `Episode ${videoData.episode ?? episode.episode}`}
                                </h3>
                                {videoData.subtitles.length > 0 && (
                                  <select
                                    value={activeSubtitleUrl}
                                    onChange={(event) => setActiveSubtitleUrl(event.target.value)}
                                    className="rounded-lg border border-white/20 bg-[#0E1220] px-2 py-1 text-xs text-white outline-none"
                                  >
                                    {videoData.subtitles.map((sub) => (
                                      <option key={sub.url} value={sub.url}>
                                        {sub.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <video
                                ref={videoRef}
                                key={`${videoData.videoUrl}-${activeSubtitleUrl}`}
                                controls
                                className="h-auto w-full rounded-xl"
                                onLoadedMetadata={adjustSubtitleCues}
                              >
                                <source src={videoData.videoUrl} />
                                {activeSubtitleUrl && (
                                  <track
                                    kind="subtitles"
                                    srcLang="id"
                                    label="Subtitle"
                                    src={activeSubtitleUrl}
                                    default
                                    onLoad={adjustSubtitleCues}
                                  />
                                )}
                              </video>
                            </div>
                          )}
                          <EpisodeRow
                            part={`Part ${episode.episode}`}
                            status={isEpisodeFree ? "Gratis" : "VIP"}
                            isFree={isEpisodeFree}
                            isLoading={isLoadingVideoEp === episode.episode}
                            onClick={() => handleWatchEpisode(episode.episode)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleWatchEpisode(1)}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-violet-500 py-4 font-bold shadow-lg shadow-purple-900/40"
              >
                {isLoadingVideoEp === 1 ? "Membuka..." : "📺 Tonton Episode 1"}
              </button>
            </div>
          </div>
        </div>

        <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080A12] text-white">
      <div className="mx-auto max-w-md px-4 pb-24 pt-5">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-200">👑 Telegram Mini App</p>
            <h1 className="text-2xl font-bold text-[#F6D58B]">DramaKu VIP</h1>
          </div>

          <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm">
            🔔
          </button>
        </header>

        <div className="mb-5">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari drama..."
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-white/40 focus:border-purple-400"
          />
        </div>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Kategori</h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs ${
                  activeCategory === category
                    ? "bg-purple-600 text-white"
                    : "border border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Lagi Populer</h2>
            <button className="text-xs text-purple-300">{activeCategory}</button>
          </div>

          {isLoadingDrama && <p className="mb-3 text-xs text-white/60">Memuat data drama...</p>}
          {!isLoadingDrama && dramaError && (
            <p className="mb-3 text-xs text-red-300">{dramaError}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {visibleDramas.map((drama) => (
              <button
                key={drama.id}
                onClick={() => setSelectedDrama(drama)}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left"
              >
                <div
                  className="relative h-40 bg-cover bg-center"
                  style={{ backgroundImage: `url(${drama.image})` }}
                >
                  {drama.isVip && (
                    <span className="absolute right-2 top-2 rounded-full bg-[#F6D58B] px-2 py-1 text-xs font-bold text-black">
                      VIP
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-bold">
                    {drama.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/50">{drama.genre}</p>
                  <p className="mt-2 text-xs text-white/60">
                    ⭐ {drama.rating} • {drama.episodes} eps
                  </p>
                </div>
              </button>
            ))}
          </div>
          {!isLoadingDrama && hasMoreDrama && (
            <button
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="mt-4 w-full rounded-xl border border-white/15 bg-white/10 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Load More ({filteredDramas.length - visibleCount} lagi)
            </button>
          )}
          {!isLoadingDrama && filteredDramas.length === 0 && (
            <p className="mt-3 text-xs text-white/60">
              Tidak ada data untuk kategori ini.
            </p>
          )}
        </section>
      </div>

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </main>
  );
}

function EpisodeRow({
  part,
  status,
  isFree = false,
  isLoading = false,
  onClick,
}: {
  part: string;
  status: string;
  isFree?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
        isFree
          ? "border-purple-400 bg-purple-500/15"
          : "border-white/10 bg-white/5"
      } w-full text-left`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            isFree ? "bg-purple-600" : "bg-white/10"
          }`}
        >
          {isFree ? "▶" : "🔒"}
        </div>

        <div>
          <p className="font-semibold">{part}</p>
        </div>
      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          isFree ? "bg-green-500/20 text-green-300" : "bg-[#F6D58B] text-black"
        }`}
      >
        {isLoading ? "Loading..." : status}
      </span>
    </button>
  );
}

function BottomNav({
  activeTab,
  onChangeTab,
}: {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
}) {
  return (
    <nav className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t border-white/10 bg-[#0B0D16]/95 px-4 py-3 backdrop-blur">
      <div className="grid grid-cols-3 text-center text-xs">
        <button
          onClick={() => onChangeTab("home")}
          className={activeTab === "home" ? "text-purple-300" : "text-white/60"}
        >
          <div className="text-lg">🏠</div>
          Home
        </button>
        <button
          onClick={() => onChangeTab("vip")}
          className={activeTab === "vip" ? "text-purple-300" : "text-white/60"}
        >
          <div className="text-lg">👑</div>
          VIP
        </button>
        <button
          onClick={() => onChangeTab("request")}
          className={activeTab === "request" ? "text-purple-300" : "text-white/60"}
        >
          <div className="text-lg">📝</div>
          Request
        </button>
      </div>
    </nav>
  );
}
