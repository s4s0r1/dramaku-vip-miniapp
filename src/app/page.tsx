"use client";

import { useEffect, useMemo, useState } from "react";

type Drama = {
  id: number;
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

const categories = ["Terbaru", "Populer", "Romantis", "Action", "Kostum"];
type Tab = "home" | "vip" | "request" | "akun";
type VipPlan = {
  id: string;
  days: number;
  price: number;
  isPopular?: boolean;
  note: string;
};

type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
};

function resolveTelegramUser(): TelegramUser {
  if (typeof window !== "undefined") {
    const webAppUser = (
      window as Window & {
        Telegram?: {
          WebApp?: {
            initDataUnsafe?: {
              user?: TelegramUser;
            };
          };
        };
      }
    ).Telegram?.WebApp?.initDataUnsafe?.user;
    if (webAppUser) {
      return webAppUser;
    }
  }

  return {
    id: 11770001,
    first_name: "Sahabat",
    last_name: "Drama",
    username: "dramalover",
    language_code: "id",
    is_premium: false,
  };
}

const vipPlans: VipPlan[] = [
  { id: "vip_1", days: 1, price: 12000, note: "Cocok untuk coba dulu." },
  { id: "vip_3", days: 3, price: 30000, note: "Lebih hemat untuk maraton." },
  {
    id: "vip_7",
    days: 7,
    price: 60000,
    isPopular: true,
    note: "Paling favorit pengguna.",
  },
  { id: "vip_15", days: 15, price: 110000, note: "Buat yang nonton rutin." },
  {
    id: "vip_30",
    days: 30,
    price: 199000,
    note: "Best value, akses paling panjang.",
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [requestTitle, setRequestTitle] = useState("");
  const [requestGenre, setRequestGenre] = useState("Romantis");
  const [requestNote, setRequestNote] = useState("");
  const [telegramUser] = useState<TelegramUser>(resolveTelegramUser);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [isLoadingDrama, setIsLoadingDrama] = useState<boolean>(false);
  const [dramaError, setDramaError] = useState<string>("");
  const [detailData, setDetailData] = useState<DramaDetail | null>(null);
  const [detailError, setDetailError] = useState<string>("");
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isLoadingVideoEp, setIsLoadingVideoEp] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDramas = async () => {
      setIsLoadingDrama(true);
      setDramaError("");
      try {
        const endpoint = query.trim()
          ? `/api/dramas?q=${encodeURIComponent(query.trim())}`
          : "/api/dramas";
        const response = await fetch(endpoint, { cache: "no-store" });
        const json = await response.json();
        if (cancelled) return;
        if (!json?.ok || !Array.isArray(json?.items)) {
          setDramaError("Data drama belum tersedia.");
          setDramas([]);
          return;
        }
        setDramas(json.items as Drama[]);
      } catch {
        if (!cancelled) {
          setDramaError("Gagal memuat drama.");
          setDramas([]);
        }
      } finally {
        if (!cancelled) setIsLoadingDrama(false);
      }
    };
    loadDramas();
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const loadDetail = async () => {
      if (!selectedDrama) {
        setDetailData(null);
        setDetailError("");
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
      window.open(String(json.data.videoUrl), "_blank");
    } catch {
      alert("Gagal mengambil video episode.");
    } finally {
      setIsLoadingVideoEp(null);
    }
  };

  const filteredDramas = useMemo(() => dramas, [dramas]);

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
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  plan.isPopular
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
                </div>
              </button>
            ))}
          </div>

          <button className="mt-5 w-full rounded-2xl bg-[#F6D58B] py-3 font-bold text-black">
            Lanjut Pembayaran
          </button>
          <p className="mt-2 text-center text-xs text-white/40">
            Harga bisa kamu ubah nanti dari admin panel.
          </p>
          <div className="h-2" />
        </div>

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
            <button className="w-full rounded-xl bg-cyan-300 py-3 font-bold text-[#0A1B25]">
              Kirim Request
            </button>
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

  if (activeTab === "akun") {
    const displayName = `${telegramUser?.first_name ?? "Pengguna"} ${
      telegramUser?.last_name ?? ""
    }`.trim();

    return (
      <main className="min-h-screen bg-[#080A12] text-white">
        <div className="mx-auto max-w-md px-4 pb-24 pt-5">
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#352C4D] via-[#171326] to-[#0B0D16] p-5 shadow-xl">
            <p className="text-xs text-purple-200">Profil Telegram</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Akun Saya</h1>
            <p className="mt-2 text-sm text-white/70">
              Data user ditarik dari Telegram Mini App.
            </p>
          </section>

          <div className="mt-5 space-y-3">
            <ProfileRow label="Nama" value={displayName} />
            <ProfileRow label="User ID" value={String(telegramUser?.id ?? "-")} />
            <ProfileRow
              label="Username"
              value={telegramUser?.username ? `@${telegramUser.username}` : "-"}
            />
            <ProfileRow
              label="Bahasa"
              value={(telegramUser?.language_code ?? "id").toUpperCase()}
            />
            <ProfileRow
              label="Telegram Premium"
              value={telegramUser?.is_premium ? "Ya" : "Tidak"}
            />
            <ProfileRow label="Status VIP" value="Belum aktif" highlight />
          </div>

          <button className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#F6D58B] to-[#D5A85A] py-3 font-bold text-black">
            Upgrade ke VIP
          </button>
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
                  {selectedDrama.episodes} Episode
                </p>
              </div>

              <div>
                <h2 className="mb-2 font-semibold">Sinopsis</h2>
                <p className="text-sm leading-6 text-white/70">
                  {selectedDrama.synopsis}
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
                    {(detailData?.episodes ?? []).slice(0, 12).map((episode) => (
                      <EpisodeRow
                        key={episode.episode}
                        part={`Part ${episode.episode}`}
                        status={episode.free ? "Gratis" : "VIP"}
                        isFree={episode.free}
                        isLoading={isLoadingVideoEp === episode.episode}
                        onClick={() => handleWatchEpisode(episode.episode)}
                      />
                    ))}
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

        <section className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-purple-900 via-[#161827] to-[#0C0D15] p-5 shadow-xl">
          <p className="mb-2 text-xs text-purple-200">Drama Pilihan Hari Ini</p>
          <h2 className="max-w-[240px] text-2xl font-bold">
            {dramas[0]?.title ?? "Belum ada rekomendasi"}
          </h2>
          <p className="mt-2 max-w-[260px] text-sm text-white/70">
            {dramas[0]?.synopsis ?? "Hubungkan dulu ke sumber drama untuk menampilkan konten."}
          </p>
          <button
            onClick={() => dramas[0] && setSelectedDrama(dramas[0])}
            className="mt-5 rounded-xl bg-[#F6D58B] px-4 py-2 text-sm font-bold text-black"
          >
            Lihat Sekarang
          </button>
        </section>

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Kategori</h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((category, index) => (
              <button
                key={category}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs ${
                  index === 0
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
            <button className="text-xs text-purple-300">Lihat Semua</button>
          </div>

          {isLoadingDrama && <p className="mb-3 text-xs text-white/60">Memuat data drama...</p>}
          {!isLoadingDrama && dramaError && (
            <p className="mb-3 text-xs text-red-300">{dramaError}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {filteredDramas.map((drama) => (
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
          <p className="text-xs text-white/50">45 menit</p>
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
      <div className="grid grid-cols-4 text-center text-xs">
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
        <button
          onClick={() => onChangeTab("akun")}
          className={activeTab === "akun" ? "text-purple-300" : "text-white/60"}
        >
          <div className="text-lg">👤</div>
          Akun
        </button>
      </div>
    </nav>
  );
}

function ProfileRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        highlight
          ? "border-[#F6D58B]/40 bg-[#F6D58B]/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
