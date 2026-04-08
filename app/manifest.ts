export default function manifest() {
  const mobileLogoPath = "/4321.png"

  return {
    name: "مجمع الملك خالد",
    short_name: "الملك خالد",
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
        src: mobileLogoPath,
        type: "image/png",
        sizes: "512x512",
      },
      {
        src: mobileLogoPath,
        type: "image/png",
        sizes: "512x512",
      },
    ],
  }
}