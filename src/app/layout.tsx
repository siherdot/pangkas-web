import type { Metadata } from "next";
import { Bebas_Neue, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Pangkas — Barbershop Medan | Booking Tanpa Antre",
  description:
    "Barbershop Pangkas: potong rapi, harga transparan, booking slot jam dan barber favorit. Datang tinggal duduk.",
  openGraph: {
    title: "Pangkas — Barbershop Medan",
    description: "Booking dulu, datang tinggal duduk. Harga mulai Rp25rb.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
