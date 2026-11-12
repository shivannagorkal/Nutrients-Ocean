import siteData from "@/data/siteData";
import Reveal from "@/components/Reveal";

export default function Team() {
  return (
    <section id="team" className="section team-section">
      <div className="container">
        <Reveal className="section-header team-header">
          <p className="eyebrow">Our Team</p>
          <h2 className="section-title">{siteData.team.title}</h2>
          <p className="section-sub">{siteData.team.subtitle}</p>
        </Reveal>

        <div className="team-grid">
          {siteData.team.members.map((member, index) => (
            <Reveal key={member.name} delay={index * 80}>
              <article className="team-card card">
                <div className="team-photo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="team-photo"
                    loading="lazy"
                  />
                </div>
                <div className="team-info">
                  <h3>{member.name}</h3>
                  <p className="team-role">{member.role}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
