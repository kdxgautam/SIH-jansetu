"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, ArrowUpRight, MapPin, Lightbulb, Handshake, UsersThree, GraduationCap,
  Buildings, ShieldCheck, Leaf, MagnifyingGlass, Drop, Plant, Lightning, FirstAid,
  CheckCircle, Sparkle, Trophy, Broadcast, CaretRight
} from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useResource } from "@/lib/api";
import type { Analytics, Challenge, Organization } from "@/lib/types";
import { usePortal } from "./providers";
import { Badge, ChallengeCard, DateText, Empty, ErrorBox, Loading, Panel, Progress, Select } from "./ui";
import { SupportForm } from "./project-forms";

const heroSlides = [
  {
    src: "/hero-collab-hires.jpg",
    alt: "Field collaboration on solar water purification",
    caption: "Clean Water Mission · IIT Kharagpur & Village Elders",
  },
  {
    src: "/women-shg-hires.jpg",
    alt: "Women Self-Help Group agro-machinery co-design",
    caption: "Women SHG Agro-Innovation · Gumla District",
  },
  {
    src: "/rural-edu-hires.jpg",
    alt: "Interactive solar digital classrooms in rural schools",
    caption: "Smart Solar Classrooms · Khunti Primary School",
  },
];

export function HomePage() {
  const { t, lang, user } = usePortal();
  const stats = useResource<Analytics>("/public/analytics");
  const challenges = useResource<Challenge[]>("/public/challenges?limit=3");
  const [activeRole, setActiveRole] = useState<"citizen" | "university" | "industry" | "government">("citizen");
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const topDistricts = ["Ranchi", "Dhanbad", "Palamu", "Hazaribagh", "East Singhbhum", "Bokaro", "Dumka"];

  const roleDetails = {
    citizen: {
      title: t("role_citizen_title"),
      copy: t("role_citizen_copy"),
      bullets: [t("role_citizen_b1"), t("role_citizen_b2"), t("role_citizen_b3")],
      ctaText: t("role_citizen_cta"),
      ctaLink: user ? "/workspace/new" : "/register",
      icon: UsersThree,
    },
    university: {
      title: t("role_university_title"),
      copy: t("role_university_copy"),
      bullets: [t("role_university_b1"), t("role_university_b2"), t("role_university_b3")],
      ctaText: t("role_university_cta"),
      ctaLink: "/challenges",
      icon: GraduationCap,
    },
    industry: {
      title: t("role_industry_title"),
      copy: t("role_industry_copy"),
      bullets: [t("role_industry_b1"), t("role_industry_b2"), t("role_industry_b3")],
      ctaText: t("role_industry_cta"),
      ctaLink: "/challenges",
      icon: Buildings,
    },
    government: {
      title: t("role_government_title"),
      copy: t("role_government_copy"),
      bullets: [t("role_government_b1"), t("role_government_b2"), t("role_government_b3")],
      ctaText: t("role_government_cta"),
      ctaLink: user ? "/workspace" : "/login",
      icon: ShieldCheck,
    },
  };

  return (
    <main id="main" className="home-page">

      {/* Immersive Photo Background Hero with Auto-Slide */}
      <section className="hero-banner-container container">
        <div className="hero-banner">
          {heroSlides.map((slide, idx) => (
            <div
              key={slide.src}
              className={`hero-slide-item ${idx === currentSlide ? "active" : ""}`}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={idx === 0}
                quality={95}
                sizes="(max-width: 1240px) 100vw, 1240px"
                className="hero-banner-bg"
                style={{ objectFit: "cover", objectPosition: "center right" }}
              />
            </div>
          ))}
          <div className="hero-banner-gradient" />
          <div className="hero-banner-content">
            <div className="eyebrow hero-eyebrow-light">
              <span className="eyebrow-line" />
              {t("hero_eyebrow")}
            </div>
            <h1>
              {t("hero_title_1")}<br />
              <span>{t("hero_title_2")}</span>
            </h1>
            <p className="hero-description">{t("hero_copy")}</p>
            <div className="hero-actions">
              <Link href={user ? "/workspace/new" : "/register"} className="button hero-btn-primary large">
                {t("submit_challenge")}
                <ArrowRight size={20} />
              </Link>
              <Link href="/challenges" className="button hero-btn-secondary large">
                {t("explore")}
                <ArrowUpRight size={20} />
              </Link>
            </div>
          </div>
          <div className="hero-banner-badge">
            <Leaf size={16} weight="duotone" />
            <span>{heroSlides[currentSlide].caption}</span>
            <div className="hero-slide-dots">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentSlide(i)}
                  className={`hero-dot ${i === currentSlide ? "active" : ""}`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Clean Solid Stats */}
      <section className="stats-strip-modern container" aria-label={t("analytics")}>
        {stats.error ? (
          <ErrorBox code={stats.error} retry={stats.refresh} />
        ) : (
          <div className="modern-stats-grid">
            <div className="modern-stat-card">
              <div className="stat-card-icon icon-emerald">
                <Lightbulb size={26} weight="duotone" />
              </div>
              <div className="stat-card-body">
                <strong>{stats.data ? stats.data.challenges.toLocaleString("en-IN") : <span className="skeleton inline-skeleton" />}</strong>
                <span className="stat-title">{t("challenges")}</span>
                <span className="stat-subtitle">{t("stat_challenges_desc")}</span>
              </div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-card-icon icon-blue">
                <GraduationCap size={26} weight="duotone" />
              </div>
              <div className="stat-card-body">
                <strong>{stats.data ? stats.data.universities.toLocaleString("en-IN") : <span className="skeleton inline-skeleton" />}</strong>
                <span className="stat-title">{t("universities")}</span>
                <span className="stat-subtitle">{t("stat_universities_desc")}</span>
              </div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-card-icon icon-purple">
                <Handshake size={26} weight="duotone" />
              </div>
              <div className="stat-card-body">
                <strong>
                  {stats.data ? `₹${(stats.data.funding_committed).toLocaleString("en-IN")}` : <span className="skeleton inline-skeleton" />}
                </strong>
                <span className="stat-title">{t("funding_committed")}</span>
                <span className="stat-subtitle">{t("stat_funding_desc")}</span>
              </div>
            </div>

            <div className="modern-stat-card">
              <div className="stat-card-icon icon-amber">
                <UsersThree size={26} weight="duotone" />
              </div>
              <div className="stat-card-body">
                <strong>{stats.data ? stats.data.beneficiaries.toLocaleString("en-IN") : <span className="skeleton inline-skeleton" />}</strong>
                <span className="stat-title">{t("beneficiaries")}</span>
                <span className="stat-subtitle">{t("stat_beneficiaries_desc")}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Field Projects Photo Showcase */}
      <section className="field-stories-section section-space">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                VERIFIED OUTCOMES
              </div>
              <h2>{t("stories_title")}</h2>
              <p>{t("stories_copy")}</p>
            </div>
            <Link href="/challenges" className="text-link">
              {t("view_all")}
              <ArrowRight size={19} />
            </Link>
          </div>

          <div className="field-stories-grid">
            <article className="story-card">
              <div className="story-image-wrap">
                <Image
                  src="/water-project.jpg"
                  alt="Fluoride remediation water project in Palamu"
                  width={600}
                  height={340}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="story-district-tag">{t("story1_tag")}</span>
              </div>
              <div className="story-content">
                <h3>{t("story1_title")}</h3>
                <p>{t("story1_desc")}</p>
                <div className="story-meta">
                  <span><strong>120</strong> Households Safe</span>
                  <span><strong>8.4 → 1.1</strong> mg/L</span>
                </div>
              </div>
            </article>

            <article className="story-card">
              <div className="story-image-wrap">
                <Image
                  src="/solar-irrigation.jpg"
                  alt="Solar drip irrigation in Ranchi"
                  width={600}
                  height={340}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="story-district-tag">{t("story2_tag")}</span>
              </div>
              <div className="story-content">
                <h3>{t("story2_title")}</h3>
                <p>{t("story2_desc")}</p>
                <div className="story-meta">
                  <span><strong>60%</strong> Cost Saved</span>
                  <span><strong>2x</strong> Annual Crops</span>
                </div>
              </div>
            </article>

            <article className="story-card">
              <div className="story-image-wrap">
                <Image
                  src="/community-health.jpg"
                  alt="Community health and diagnostics in Hazaribagh"
                  width={600}
                  height={340}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="story-district-tag">{t("story3_tag")}</span>
              </div>
              <div className="story-content">
                <h3>{t("story3_title")}</h3>
                <p>{t("story3_desc")}</p>
                <div className="story-meta">
                  <span><strong>15</strong> Panchayats</span>
                  <span><strong>Field</strong> Point-of-Care</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Community Voices & Reviews */}
      <section className="community-reviews-section section-space">
        <div className="container">
          <div className="section-heading text-center centered-heading">
            <div>
              <div className="eyebrow center-eyebrow">
                <span className="eyebrow-line" />
                COMMUNITY PERSPECTIVES
                <span className="eyebrow-line" />
              </div>
              <h2>{t("reviews_title")}</h2>
              <p>{t("reviews_copy")}</p>
            </div>
          </div>

          <div className="reviews-grid">
            <div className="review-card">
              <p className="review-quote">“{t("review1_quote")}”</p>
              <div className="review-author-info">
                <div className="review-author-avatar">SD</div>
                <div>
                  <strong>{t("review1_author")}</strong>
                  <span>{t("review1_role")}</span>
                </div>
              </div>
            </div>

            <div className="review-card">
              <p className="review-quote">“{t("review2_quote")}”</p>
              <div className="review-author-info">
                <div className="review-author-avatar">AP</div>
                <div>
                  <strong>{t("review2_author")}</strong>
                  <span>{t("review2_role")}</span>
                </div>
              </div>
            </div>

            <div className="review-card">
              <p className="review-quote">“{t("review3_quote")}”</p>
              <div className="review-author-info">
                <div className="review-author-avatar">RS</div>
                <div>
                  <strong>{t("review3_author")}</strong>
                  <span>{t("review3_role")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Stakeholder Role Pathways */}
      <section className="role-pathway-section section-space">
        <div className="container">
          <div className="section-heading text-center centered-heading">
            <div>
              <div className="eyebrow center-eyebrow">
                <span className="eyebrow-line" />
                {t("institutions")}
                <span className="eyebrow-line" />
              </div>
              <h2>{t("role_pathway_title")}</h2>
              <p>{t("role_pathway_copy")}</p>
            </div>
          </div>

          {/* Role Navigation Tabs */}
          <div className="role-tabs-wrapper">
            {(["citizen", "university", "industry", "government"] as const).map(roleKey => {
              const RoleIcon = roleDetails[roleKey].icon;
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => setActiveRole(roleKey)}
                  className={`role-tab-btn ${activeRole === roleKey ? "active" : ""}`}
                >
                  <RoleIcon size={20} weight="duotone" />
                  <span>{t(roleKey)}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Card Showcase */}
          <div className="active-role-card">
            <div className="role-card-left">
              <div className="role-header-icon">
                {(() => {
                  const CurrentIcon = roleDetails[activeRole].icon;
                  return <CurrentIcon size={38} weight="duotone" />;
                })()}
              </div>
              <h3>{roleDetails[activeRole].title}</h3>
              <p className="role-card-copy">{roleDetails[activeRole].copy}</p>

              <ul className="role-bullet-list">
                {roleDetails[activeRole].bullets.map((bullet, idx) => (
                  <li key={idx}>
                    <CheckCircle size={18} weight="fill" className="bullet-check" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="role-card-actions">
                <Link href={roleDetails[activeRole].ctaLink} className="button primary large">
                  {roleDetails[activeRole].ctaText}
                  <ArrowRight size={18} />
                </Link>
                <Link href="/challenges" className="text-link">
                  {t("explore")}
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </div>

            <div className="role-card-right">
              <div className="role-image-card">
                <Image
                  src={
                    activeRole === "university"
                      ? "/students-lab.jpg"
                      : activeRole === "industry"
                      ? "/water-project.jpg"
                      : activeRole === "government"
                      ? "/community-health.jpg"
                      : "/hero-collab.jpg"
                  }
                  alt={roleDetails[activeRole].title}
                  width={540}
                  height={320}
                  sizes="(max-width: 768px) 100vw, 45vw"
                />
                <div className="role-image-overlay">
                  <span className="role-overlay-tag">{t(activeRole)}</span>
                  <h4>{roleDetails[activeRole].title}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Challenges Grid */}
      <section className="community-section section-space">
        <div className="container">
          <div className="section-heading">
            <div>
              <h2>{t("community_title")}</h2>
              <p>{t("community_copy")}</p>
            </div>
            <Link href="/challenges" className="text-link">
              {t("view_all")}
              <ArrowRight size={19} />
            </Link>
          </div>
          {challenges.error ? (
            <ErrorBox code={challenges.error} retry={challenges.refresh} />
          ) : challenges.loading ? (
            <Loading />
          ) : challenges.data?.length ? (
            <div className="challenge-grid">
              {challenges.data.map(c => (
                <ChallengeCard key={c.id} challenge={c} />
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </div>
      </section>

      {/* Districts Quick Navigation */}
      <section className="districts-strip-section">
        <div className="container">
          <div className="districts-header">
            <h3>{t("districts_title")}</h3>
            <p>{t("districts_copy")}</p>
          </div>
          <div className="districts-pill-grid">
            {topDistricts.map(dist => (
              <Link key={dist} href={`/challenges?district=${encodeURIComponent(dist)}`} className="district-chip">
                <MapPin size={16} weight="duotone" />
                <span>{t(dist)}</span>
                <CaretRight size={14} className="chip-arrow" />
              </Link>
            ))}
            <Link href="/challenges" className="district-chip chip-all">
              <span>{t("all_districts")}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="container section-space process-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              THE JANSETU METHOD
            </div>
            <h2>{t("process_title")}</h2>
          </div>
        </div>
        <div className="process-grid">
          {[
            { n: "01", title: "step1_title", copy: "step1_copy", icon: Lightbulb },
            { n: "02", title: "step2_title", copy: "step2_copy", icon: Handshake },
            { n: "03", title: "step3_title", copy: "step3_copy", icon: Leaf }
          ].map(s => (
            <article key={s.n}>
              <div className="process-top">
                <s.icon size={30} weight="duotone" />
                <span className="step-num">{s.n}</span>
              </div>
              <h3>{t(s.title)}</h3>
              <p>{t(s.copy)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Impact Philosophy Section */}
      <section id="impact" className="impact-section section-space">
        <div className="container impact-layout">
          <div className="impact-intro">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              {t("impact_eyebrow")}
            </div>
            <h2>{t("home_impact_title")}</h2>
            <p>{t("home_impact_copy")}</p>
            <Link href="/challenges" className="button secondary">
              {t("impact_link")}
              <ArrowRight size={19} />
            </Link>
          </div>
          <div className="impact-list">
            {[
              { n: "01", title: "impact_review_title", copy: "impact_review_copy", icon: ShieldCheck },
              { n: "02", title: "impact_collab_title", copy: "impact_collab_copy", icon: Handshake },
              { n: "03", title: "impact_outcome_title", copy: "impact_outcome_copy", icon: Leaf }
            ].map(item => (
              <article key={item.n} className="impact-item">
                <div className="impact-icon">
                  <item.icon size={24} weight="duotone" />
                </div>
                <div>
                  <h3>{t(item.title)}</h3>
                  <p>{t(item.copy)}</p>
                </div>
                <span className="impact-number">{item.n}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section id="faq" className="faq-section section-space">
        <div className="container faq-layout">
          <div className="faq-intro">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              {t("faq_eyebrow")}
            </div>
            <h2>{t("faq_title")}</h2>
            <p>{t("faq_copy")}</p>
          </div>
          <div className="faq-list">
            {[1, 2, 3, 4, 5].map(n => (
              <details key={n} className="faq-detail-box">
                <summary>{t(`faq_q${n}`)}</summary>
                <p>{t(`faq_a${n}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem Call to Action Banner */}
      <section id="ecosystem" className="ecosystem-banner-section">
        <div className="container">
          <div className="ecosystem-banner-card">
            <div className="banner-content">
              <h2>{t("ecosystem_title")}</h2>
              <p>{t("ecosystem_copy")}</p>
              <div className="banner-cta-row">
                <Link href="/register" className="button primary large">
                  {t("register")}
                  <ArrowRight size={18} />
                </Link>
                <Link href="/challenges" className="button secondary large">
                  {t("explore")}
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </div>
            <div className="banner-icons-grid">
              {[
                { key: "citizen", icon: UsersThree },
                { key: "university", icon: GraduationCap },
                { key: "industry", icon: Buildings },
                { key: "government", icon: ShieldCheck }
              ].map(x => (
                <div key={x.key} className="banner-role-pill">
                  <x.icon size={28} weight="duotone" />
                  <span>{t(x.key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function ExplorePage() {
  const { t } = usePortal(); const [query, setQuery] = useState(""); const [page, setPage] = useState(0); const metadata = useResource<{ districts: string[]; domains: string[] }>("/metadata");
  const list = useResource<Challenge[]>(`/public/challenges?${query}&offset=${page * 12}&limit=12`);
  return <main id="main" className="container page-space"><div className="page-heading"><div className="eyebrow">{t("explore")}</div><h1>{t("explore_title")}</h1><p>{t("explore_copy")}</p></div><form className="filter-bar" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); setQuery(new URLSearchParams(Object.fromEntries(data) as Record<string, string>).toString()); setPage(0); }}><div className="field search-field"><label htmlFor="q">{t("search")}</label><input id="q" name="q" type="search" placeholder={t("search_placeholder")} maxLength={100} /></div><Select label="district" name="district"><option value="">{t("all_districts")}</option>{metadata.data?.districts.map(d => <option key={d} value={d}>{t(d)}</option>)}</Select><Select label="domain" name="domain"><option value="">{t("all_domains")}</option>{metadata.data?.domains.map(d => <option key={d} value={d}>{t(d)}</option>)}</Select><Select label="status" name="status"><option value="">{t("all_statuses")}</option>{["validated", "assigned", "in_progress", "validation", "resolved"].map(s => <option key={s} value={s}>{t(s)}</option>)}</Select><button className="button primary" type="submit">{t("filter")}</button></form>{metadata.error && <ErrorBox code={metadata.error} retry={metadata.refresh} />}{list.loading ? <Loading /> : list.error ? <ErrorBox code={list.error} retry={list.refresh} /> : list.data?.length ? <div className="challenge-grid">{list.data.map(c => <ChallengeCard key={c.id} challenge={c} />)}</div> : <Empty />}<div className="pagination"><button className="button secondary" disabled={page === 0 || list.loading} onClick={() => setPage(p => p - 1)}>{t("previous")}</button><span>{t("page")} {page + 1}</span><button className="button secondary" disabled={list.loading || (list.data?.length || 0) < 12} onClick={() => setPage(p => p + 1)}>{t("next")}</button></div></main>;
}

export function PublicDetail({ id }: { id: string }) {
  const { t, lang, user } = usePortal(); const detail = useResource<Challenge>(`/public/challenges/${id}`); const [offered, setOffered] = useState(false);
  if (detail.loading) return <main id="main" className="container page-space"><Loading /></main>;
  if (detail.error || !detail.data) return <main id="main" className="container page-space"><ErrorBox code={detail.error || "not_found"} retry={detail.refresh} /></main>;
  const c = detail.data;
  return <main id="main" className="container page-space"><Link href="/challenges" className="text-link back-link">← {t("explore")}</Link><div className="page-heading detail-heading"><div className="inline-meta"><span className="domain-tag">{t(c.domain)}</span><Badge value={c.status} /></div><h1>{lang === "hi" ? c.public_title_hi : c.public_title_en}</h1><div className="inline-meta"><span><MapPin size={16} />{t(c.district)}</span><span>{t("submitted_on")} <DateText value={c.created_at} /></span></div></div><div className="detail-grid"><div className="stack"><Panel title="public_summary"><p className="prose">{lang === "hi" ? c.summary_hi : c.summary_en}</p><div className="notice"><ShieldCheck size={22} /><p>{t("privacy_note")}</p></div></Panel>{c.status === "resolved" && <Panel title="outcome"><div className="metric-row">{["beneficiaries", "patents", "startups"].map(k => <div key={k}><strong>{c[k as "beneficiaries" | "patents" | "startups"]}</strong><span>{t(k)}</span></div>)}</div></Panel>}{c.project_id && ["assigned", "in_progress"].includes(c.status) && <Panel title="support_challenge">{user?.role === "industry" ? offered ? <p role="status" className="success-text">{t("offered")}</p> : <SupportForm projectId={c.project_id} onDone={() => setOffered(true)} /> : <><p className="muted">{t("sign_in_support")}</p><Link href="/login" className="button secondary">{t("sign_in")}<ArrowRight size={18} /></Link></>}</Panel>}{user && <Link href={`/workspace/challenges/${c.id}`} className="text-link">{t("open_workspace")}<ArrowRight /></Link>}</div><aside className="stack"><Panel title="progress"><Progress status={c.status} /></Panel><Panel title="lead_institution"><p>{c.university_name || t("awaiting_assignment")}</p></Panel></aside></div></main>;
}
