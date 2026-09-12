"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, ArrowUpRight, MapPin, Lightbulb, Handshake, UsersThree, GraduationCap,
  Buildings, ShieldCheck, Leaf, CheckCircle, CaretRight, Pause, Play
} from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { useResource } from "@/lib/api";
import type { Analytics, Challenge } from "@/lib/types";
import { usePortal } from "./providers";
import { Badge, ChallengeCard, DateText, Empty, ErrorBox, Loading, Panel, Progress, Select } from "./ui";
import { SupportForm } from "./project-forms";

const heroSlides = [
  {
    src: "/hero-collab.jpg",
    alt: "hero_slide_water_alt",
    caption: "hero_slide_water_caption",
  },
  {
    src: "/women-shg-hires.jpg",
    alt: "hero_slide_women_alt",
    caption: "hero_slide_women_caption",
  },
  {
    src: "/rural-edu-hires.jpg",
    alt: "hero_slide_school_alt",
    caption: "hero_slide_school_caption",
  },
];

export function HomePage() {
  const { t, user } = usePortal();
  const stats = useResource<Analytics>("/public/analytics");
  const challenges = useResource<Challenge[]>("/public/challenges?limit=3");
  const [activeRole, setActiveRole] = useState<"citizen" | "university" | "industry" | "government">("citizen");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [captionSlide, setCaptionSlide] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(query.matches);
      if (query.matches) setAutoplay(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!autoplay || interactionPaused || !pageVisible) return;
    const timer = window.setTimeout(() => setCurrentSlide(prev => (prev + 1) % heroSlides.length), 6000);
    return () => window.clearTimeout(timer);
  }, [autoplay, currentSlide, interactionPaused, pageVisible]);

  useEffect(() => {
    if (reducedMotion) {
      setCaptionSlide(currentSlide);
      return;
    }
    const timer = window.setTimeout(() => setCaptionSlide(currentSlide), 300);
    return () => window.clearTimeout(timer);
  }, [currentSlide, reducedMotion]);


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
        <div
          className="hero-banner"
          role="region"
          aria-roledescription="carousel"
          aria-label={t("hero_carousel")}
          onMouseEnter={() => setInteractionPaused(true)}
          onMouseLeave={() => setInteractionPaused(false)}
          onFocusCapture={() => setInteractionPaused(true)}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteractionPaused(false);
          }}
        >
          {heroSlides.map((slide, idx) => (
            <div
              key={slide.src}
              className={`hero-slide-item ${idx === currentSlide ? "active" : ""}`}
            >
              <Image
                src={slide.src}
                alt={idx === currentSlide ? t(slide.alt) : ""}
                fill
                loading={idx === 0 ? "eager" : "lazy"}
                fetchPriority={idx === 0 ? "high" : "auto"}
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
              <Link href="/challenges" className="button hero-btn-primary large">
                {t("explore")}
                <ArrowRight size={20} />

              </Link>

              <Link href={user ? "/workspace/new" : "/register"} className="button hero-btn-secondary large">
                {t("submit_challenge")}
                <ArrowRight size={20} />

              </Link>
            </div>
          </div>
          <div className="hero-banner-footer">
            <div className="hero-banner-badge">
              <Leaf size={16} weight="duotone" />
              <span aria-live="polite">{t(heroSlides[captionSlide].caption)}</span>
            </div>
            <div className="hero-slide-dots">
              <button
                type="button"
                className="hero-carousel-toggle"
                onClick={() => setAutoplay(value => !value)}
                aria-label={t(autoplay ? "carousel_pause" : "carousel_play")}
                aria-pressed={!autoplay}
              >
                {autoplay ? <Pause size={13} weight="fill" aria-hidden="true" /> : <Play size={13} weight="fill" aria-hidden="true" />}
              </button>
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentSlide(i)}
                  className={`hero-dot ${i === currentSlide ? "active" : ""}`}
                  aria-label={`${t("carousel_slide")} ${i + 1} ${t("carousel_of")} ${heroSlides.length}`}
                  aria-current={i === currentSlide ? "true" : undefined}
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

      {/* Community-to-resolution workflow */}
      <section id="how-it-works" className="workflow-section section-space">
        <div className="container">
          <div className="section-heading workflow-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                {t("process_eyebrow")}
              </div>
              <h2>{t("workflow_title")}</h2>
              <p>{t("workflow_copy")}</p>
            </div>
          </div>
          <div className="workflow-diagram">
            <ol className="workflow-flow" aria-label={t("workflow_aria")}>
              {[
                { n: "01", title: "workflow_community_title", copy: "workflow_community_copy", icon: UsersThree },
                { n: "02", title: "workflow_government_title", copy: "workflow_government_copy", icon: ShieldCheck },
                { n: "03", title: "workflow_university_title", copy: "workflow_university_copy", icon: GraduationCap },
                { n: "04", title: "workflow_validate_title", copy: "workflow_validate_copy", icon: CheckCircle },
                { n: "05", title: "workflow_benefit_title", copy: "workflow_benefit_copy", icon: Leaf }
              ].map(stage => (
                <li key={stage.n} className="workflow-stage">
                  <div className="workflow-stage-top">
                    <span className="workflow-stage-icon"><stage.icon size={25} weight="duotone" /></span>
                    <span className="workflow-stage-number">{stage.n}</span>
                  </div>
                  <h3>{t(stage.title)}</h3>
                  <p>{t(stage.copy)}</p>
                </li>
              ))}
            </ol>
            <div className="workflow-branch">
              <span className="workflow-branch-stem" aria-hidden="true" />
              <Handshake size={20} weight="duotone" aria-hidden="true" />
              <span><strong>{t("workflow_industry_title")}</strong><small>{t("workflow_industry_copy")}</small></span>
            </div>
          </div>
        </div>
      </section>

      {/* Field Projects Photo Showcase */}
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
      <section className="field-stories-section section-space">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                {t("stories_eyebrow")}
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
                  alt={t("story1_alt")}
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
                  <span><strong>120</strong> {t("story_households_safe")}</span>
                  <span><strong>8.4 → 1.1</strong> mg/L</span>
                </div>
              </div>
            </article>

            <article className="story-card">
              <div className="story-image-wrap">
                <Image
                  src="/solar-irrigation.jpg"
                  alt={t("story2_alt")}
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
                  <span><strong>60%</strong> {t("story_cost_saved")}</span>
                  <span><strong>2x</strong> {t("story_annual_crops")}</span>
                </div>
              </div>
            </article>

            <article className="story-card">
              <div className="story-image-wrap">
                <Image
                  src="/community-health.jpg"
                  alt={t("story3_alt")}
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
                  <span><strong>15</strong> {t("story_panchayats")}</span>
                  <span><strong>{t("story_field")}</strong> {t("story_point_of_care")}</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Community Voices & Reviews */}
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
                  aria-pressed={activeRole === roleKey}
                  aria-controls="role-pathway-panel"
                >
                  <RoleIcon size={20} weight="duotone" />
                  <span>{t(roleKey)}</span>
                </button>
              );
            })}
          </div>

          {/* Active Role Card Showcase */}
          <div id="role-pathway-panel" className="active-role-card" aria-live="polite">
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
                  quality={65}
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
      <section className="join-cta-section section-space">
        <div className="container join-cta">
          <div><h2>{t("join_home_title")}</h2><p>{t("join_home_copy")}</p></div>
          <Link href="/join" className="button primary large">{t("join_cta")}<ArrowRight size={19} /></Link>
        </div>
      </section>

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
  return <main id="main" className="container page-space"><Link href="/challenges" className="text-link back-link">← {t("explore")}</Link><div className="page-heading detail-heading"><div className="inline-meta"><span className="domain-tag">{t(c.domain)}</span><Badge value={c.status} /></div><h1>{lang === "hi" ? c.public_title_hi : c.public_title_en}</h1><div className="inline-meta"><span><MapPin size={16} />{t(c.district)}</span><span>{t("submitted_on")} <DateText value={c.created_at} /></span></div></div><div className="detail-grid"><div className="stack"><Panel title="public_summary"><p className="prose">{lang === "hi" ? c.summary_hi : c.summary_en}</p><div className="notice"><ShieldCheck size={22} /><p>{t("privacy_note")}</p></div></Panel>{c.status === "resolved" && <Panel title="outcome"><div className="metric-row">{["beneficiaries", "patents", "startups"].map(k => <div key={k}><strong>{c[k as "beneficiaries" | "patents" | "startups"]}</strong><span>{t(k)}</span></div>)}</div>{c.outcome_metric && c.outcome_baseline != null && c.outcome_result != null && <div className="public-outcome-measure"><h3>{t("outcome_measure")}</h3><div className="metric-row"><div><strong>{c.outcome_baseline}</strong><span>{t("outcome_baseline")}</span></div><div><strong>{c.outcome_result}</strong><span>{t("outcome_result")}</span></div></div><p className="muted">{c.outcome_metric}{c.outcome_unit ? ` (${c.outcome_unit})` : ""}</p></div>}</Panel>}{c.project_id && ["assigned", "in_progress"].includes(c.status) && <Panel title="support_challenge">{user?.role === "industry" ? offered ? <p role="status" className="success-text">{t("offered")}</p> : <SupportForm projectId={c.project_id} onDone={() => setOffered(true)} /> : <><p className="muted">{t("sign_in_support")}</p><Link href="/login" className="button secondary">{t("sign_in")}<ArrowRight size={18} /></Link></>}</Panel>}{user && <Link href={`/workspace/challenges/${c.id}`} className="text-link">{t("open_workspace")}<ArrowRight /></Link>}</div><aside className="stack"><Panel title="progress"><Progress status={c.status} /></Panel><Panel title="lead_institution"><p>{c.university_name || t("awaiting_assignment")}</p></Panel></aside></div></main>;
}
