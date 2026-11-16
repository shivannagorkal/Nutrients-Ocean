import Link from "next/link";
import { ArrowRight, Dumbbell, IndianRupee, Leaf, MapPin, Phone } from "lucide-react";
import siteData from "@/data/siteData";
import Reveal from "@/components/Reveal";

const iconMap = {
  Leaf,
  Dumbbell,
  MapPin,
  Phone,
  IndianRupee,
};

export default function WhyNutrientsOcean() {
  const { why } = siteData;

  return (
    <section id="why" className="section">
      <div className="container">
        <Reveal className="section-header">
          <p className="eyebrow">Why Us</p>
          <h2 className="section-title">{why.title}</h2>
          <p className="section-sub">{why.subtitle}</p>
        </Reveal>

        <div className="why-grid">
          {why.points.map((point, index) => {
            const IconComponent = iconMap[point.icon] || Leaf;
            return (
              <Reveal key={point.title} delay={index * 80}>
                <article className="why-card card">
                  <div className="why-icon-circle">
                    <IconComponent size={24} />
                  </div>
                  <h3>{point.title}</h3>
                  <p>{point.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        {why.timingGuide?.slots?.length > 0 && (
          <Reveal delay={140} className="why-timing-strip">
            {why.timingGuide.slots.map((slot) => (
              <div key={slot.timing} className="why-timing-item">
                <span className="why-timing-badge">{slot.badge}</span>
                <h4>{slot.timing}</h4>
                <p className="why-timing-items">{slot.items}</p>
              </div>
            ))}
          </Reveal>
        )}

        <Reveal delay={180} className="why-cta-row">
          <Link href="/why-us" className="btn btn-primary">
            <span>Compare &amp; Learn More</span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/menu" className="btn btn-tonal">
            <span>Browse Full Menu</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
