import App from "@/components/App";
import HomeContent from "@/components/HomeContent";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ofertasegura.netlify.app";

export default function Home() {
  return (
    <App>
      <HomeContent siteUrl={`${siteUrl.replace(/\/$/, "")}/`} />
    </App>
  );
}
