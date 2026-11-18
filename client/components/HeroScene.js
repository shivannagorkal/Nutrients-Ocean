import siteData from "@/data/siteData";
import { Zap, Clock } from "lucide-react";

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
        <div className="hero-media-overlay-chips">
          <span className="hero-floating-chip chip-protein">
            <Zap size={14} />
            <span>High Protein</span>
          </span>
          <span className="hero-floating-chip chip-pickup">
            <Clock size={14} />
            <span>5-Min Stall Pickup</span>
          </span>
        </div>
      </div>
    </div>
  );
}
