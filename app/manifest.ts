export default function manifest() {
  const appIcon192Path = "/icon-192.png"
  const appIcon512Path = "/icon-512.png"

  return {
    name: "مجمع الملك خالد",
    short_name: "مجمع الملك خالد",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fbff",
    theme_color: "#3453a7",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: appIcon192Path,
        type: "image/png",
        sizes: "192x192",
        purpose: "any maskable",
      },
      {
        src: appIcon512Path,
        type: "image/png",
        sizes: "512x512",
        purpose: "any maskable",
      },
    ],
  }
}