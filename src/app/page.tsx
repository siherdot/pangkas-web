import Link from "next/link";
import BookingForm from "@/components/booking-form";
import { BARBERS, SERVICES, SHOP } from "@/lib/catalog";

function rupiah(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}

export default function Home() {
  const waChat = `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(
    `Halo ${SHOP.name}, saya mau tanya soal booking.`,
  )}`;

  return (
    <main className="flex-1">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="display flex h-10 w-10 items-center justify-center rounded-full bg-ink text-xl text-brass">
              PK
            </span>
            <span className="leading-none">
              <span className="display block text-2xl">{SHOP.name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ink/50">
                {SHOP.tagline}
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink/70 md:flex">
            <a href="#harga" className="hover:text-ink">Harga</a>
            <a href="#barber" className="hover:text-ink">Barber</a>
            <a href="#booking" className="hover:text-ink">Booking</a>
            <a href="#info" className="hover:text-ink">Info</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden text-xs font-semibold uppercase tracking-wider text-ink/40 hover:text-ink sm:block"
            >
              Admin
            </Link>
            <a
              href="#booking"
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-ink/85"
            >
              Booking
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-cream">
        <div className="grain absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brass">
              Barbershop — {SHOP.city}
            </p>
            <h1 className="display mt-5 text-6xl sm:text-7xl md:text-8xl">
              Potong Rapi
              <br />
              <span className="text-brass">Tanpa Antre Lama</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-cream/70 sm:text-lg">
              Pilih layanan, pilih barber favorit, tentukan jamnya dari HP.
              Pas datang, kursi sudah siap — tidak perlu menunggu giliran di
              tempat.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#booking"
                className="rounded-full bg-brass px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-ink transition hover:bg-brass-soft"
              >
                Booking Online
              </a>
              <a
                href="#harga"
                className="rounded-full border border-cream/25 px-7 py-3.5 text-sm font-semibold transition hover:border-cream/60"
              >
                Lihat Daftar Harga
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-8 text-sm">
              <div>
                <p className="display text-3xl text-brass">{SHOP.hours}</p>
                <p className="text-cream/50">Buka setiap hari</p>
              </div>
              <div>
                <p className="display text-3xl text-brass">Mulai Rp25rb</p>
                <p className="text-cream/50">Harga transparan</p>
              </div>
              <div>
                <p className="display text-3xl text-brass">3 Barber</p>
                <p className="text-cream/50">Bisa pilih sendiri</p>
              </div>
            </div>
          </div>

          <div className="relative flex items-end justify-center">
            <div className="w-full max-w-sm rounded-[2rem] border border-cream/15 bg-gradient-to-b from-cream/10 to-transparent p-6">
              <div className="flex items-center gap-1 text-brass">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
                <span className="ml-2 text-sm text-cream/70">4,9 di Google</span>
              </div>
              <p className="mt-4 text-lg font-semibold leading-snug">
                “Datang jam 7 malam, langsung dicukur. Nggak nunggu sama
                sekali.”
              </p>
              <p className="mt-3 text-sm text-cream/50">— Rizky, pelanggan</p>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {BARBERS.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-cream/10 bg-cream/5 p-3 text-center"
                  >
                    <span className="display mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brass text-lg text-ink">
                      {b.initials}
                    </span>
                    <p className="mt-2 text-xs font-semibold">{b.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HARGA */}
      <section id="harga" className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brass">
            Daftar Harga
          </p>
          <h2 className="display mt-3 text-5xl sm:text-6xl">
            Harga jelas dari awal, tidak ada biaya kejutan
          </h2>
          <p className="mt-4 text-ink/60">
            Semua harga tampil terbuka. Saat booking, total yang harus dibayar
            langsung terlihat sebelum kamu datang. Bayar di tempat setelah
            selesai cukur — tunai atau QRIS.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div
              key={s.id}
              className="group relative rounded-3xl border border-ink/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              {s.popular && (
                <span className="absolute right-5 top-5 rounded-full bg-moss px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cream">
                  Favorit
                </span>
              )}
              <h3 className="text-lg font-bold">{s.name}</h3>
              <p className="mt-2 min-h-[3rem] text-sm text-ink/55">{s.desc}</p>
              <div className="mt-5 flex items-end justify-between border-t border-ink/10 pt-4">
                <div>
                  <p className="display text-3xl">{rupiah(s.price)}</p>
                  <p className="text-xs text-ink/45">± {s.duration} menit</p>
                </div>
                <a
                  href="#booking"
                  className="rounded-full border border-ink/15 px-4 py-2 text-xs font-bold uppercase tracking-wide transition group-hover:border-brass group-hover:bg-brass"
                >
                  Pesan
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BARBER */}
      <section id="barber" className="bg-moss py-16 text-cream md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brass-soft">
              Tim Barber
            </p>
            <h2 className="display mt-3 text-5xl sm:text-6xl">
              Pilih barber yang paling cocok dengan gayamu
            </h2>
            <p className="mt-4 text-cream/65">
              Tiap barber punya spesialisasi berbeda. Saat booking, kamu bebas
              memilih siapa yang menangani.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {BARBERS.map((b) => (
              <div
                key={b.id}
                className="rounded-3xl border border-cream/15 bg-cream/5 p-6"
              >
                <span className="display flex h-16 w-16 items-center justify-center rounded-full bg-brass text-2xl text-ink">
                  {b.initials}
                </span>
                <h3 className="mt-5 text-xl font-bold">{b.name}</h3>
                <p className="text-sm text-cream/60">{b.role}</p>
                <p className="mt-4 text-xs uppercase tracking-wider text-cream/40">
                  {b.years} tahun pengalaman
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKING */}
      <section id="booking" className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brass">
              Booking Online
            </p>
            <h2 className="display mt-3 text-5xl sm:text-6xl">
              Amankan jam kamu dalam waktu kurang dari semenit
            </h2>
            <p className="mt-4 text-ink/60">
              Pilih layanan, barber, tanggal, dan jam. Kamu langsung dapat kode
              booking — slot yang sudah penuh tidak bisa dipilih.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              {[
                ["Jam pasti, bukan kira-kira", "Kode booking mengunci jam kedatanganmu. Datang sesuai jam, langsung dilayani."],
                ["Harga transparan", "Total booking terlihat di ringkasan — bayar sesuai yang tertera."],
                ["Konfirmasi WhatsApp", "Setelah booking, satu klik untuk konfirmasi ke nomor barbershop."],
              ].map(([title, body]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass/20 text-xs font-bold text-brass">
                    ✓
                  </span>
                  <span>
                    <span className="font-semibold">{title}</span>
                    <span className="block text-ink/55">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <BookingForm
            services={SERVICES}
            barbers={BARBERS}
            whatsapp={SHOP.whatsapp}
            shopName={SHOP.name}
          />
        </div>
      </section>

      {/* INFO */}
      <section id="info" className="border-y border-ink/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <div>
            <h3 className="display text-2xl">Alamat</h3>
            <p className="mt-2 text-sm text-ink/60">{SHOP.address}</p>
          </div>
          <div>
            <h3 className="display text-2xl">Jam buka</h3>
            <p className="mt-2 text-sm text-ink/60">
              Setiap hari {SHOP.hours} WIB. Booking terakhir pukul{" "}
              {SHOP.lastBooking}.
            </p>
          </div>
          <div>
            <h3 className="display text-2xl">Kontak</h3>
            <p className="mt-2 text-sm text-ink/60">
              WhatsApp{" "}
              <a className="font-semibold text-ink hover:text-brass" href={waChat}>
                +{SHOP.whatsapp}
              </a>
              <br />
              Instagram {SHOP.instagram}
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-ink py-10 text-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <p className="text-sm text-cream/50">
            © {new Date().getFullYear()} {SHOP.name} {SHOP.tagline}. Semua hak
            dilindungi.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <a href="#booking" className="hover:text-brass">Booking</a>
            <a href={waChat} className="hover:text-brass" target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            <Link href="/admin/login" className="text-cream/40 hover:text-brass">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
