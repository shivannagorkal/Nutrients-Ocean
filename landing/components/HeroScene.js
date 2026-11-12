import siteData from "@/data/siteData";

export default function HeroScene() {
  const { hero, brand } = siteData;
  const imageSrc = hero.image || "/images/hero_showcase.jpg";

  return (
    <div className="hero-media">
      <div className="hero-media-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={`Fresh protein meal from ${brand.name}`}
          className="hero-media-img"
          loading="eager"
        />
      </div>
    </div>
  );
}
