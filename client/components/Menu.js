import Link from "next/link";
import { Phone, ArrowRight } from "lucide-react";
import siteData from "@/data/siteData";
import Reveal from "./Reveal";
import TiltCard from "./TiltCard";

export default function Menu() {
  const { menu, contact } = siteData;
  const tel = `tel:${contact.phoneRaw}`;
  return (
    <section id="menu" className="section section-tonal">
      <div className="container">
        <Reveal className="section-head">
          <p className="eyebrow">Fresh menu</p>
          <h2 className="section-title">{menu.title}</h2>
          <p className="section-sub">{menu.subtitle}</p>
        </Reveal>

        <div className="menu-grid">
          {menu.items.map((item, i) => (
            <Reveal key={item.id} delay={i * 80}>
              <TiltCard className="menu-card">
                <div className="menu-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={`${item.name} from Nexvyro Fitness`} loading="lazy" />
                  <span className="menu-tag">{item.tag}</span>
                  <span className="menu-price">{item.price}</span>
                </div>
                <div className="menu-body">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="menu-foot">
                    <a className="btn btn-tonal btn-sm" href={tel}>
                      <Phone size={16} />
                      Pre-order
                    </a>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <p className="menu-note">{menu.note}</p>

        <Reveal delay={160} className="menu-cta-wrap">
          <Link href="/menu" className="btn btn-primary menu-explore-btn">
            <span>Explore Full Menu</span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/menu#subscriptions" className="btn btn-tonal">
            <span>Monthly Plans (From ₹1,199)</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
