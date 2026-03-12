'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';

/* ── Fonts ─────────────────────────────────────────────── */
const serif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

/* ── KPI counter hook ──────────────────────────────────── */
function useCountUp(end: number, duration = 1500, decimals = 0) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setValue(parseFloat((eased * end).toFixed(decimals)));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, decimals]);

  return { ref, value };
}

/* ── Data ──────────────────────────────────────────────── */
const kpis = [
  { end: 91.2, label: 'Compliance Rate', suffix: '%', decimals: 1 },
  { end: 247, label: 'Active Cases Tracked', suffix: '', decimals: 0 },
  { end: 70, label: 'Manual Review Time Reduced', suffix: '%', decimals: 0 },
  { end: 27, label: 'Annual Cost Avoidance', prefix: '$', suffix: 'K', decimals: 0 },
] as const;

const features = [
  {
    icon: '\u{1F5FA}\uFE0F',
    title: 'GIS Violation Map',
    body: 'Live parcel-level violation mapping with 21 active incidents and zone clustering for patrol route planning.',
  },
  {
    icon: '\u{1F4CB}',
    title: 'Patrol Log',
    body: 'Digital patrol entry replacing paper logs. AMI-integrated, CSV-exportable, and linked to violation workflow.',
  },
  {
    icon: '\u2696\uFE0F',
    title: 'Violation Workflow',
    body: 'Full case lifecycle with FAC 40D-22 fine calculator. 1st offense $193 \u00B7 2nd offense $386 \u2014 auto-calculated.',
  },
  {
    icon: '\u{1F916}',
    title: 'AI Conservation Chatbot',
    body: 'Anthropic Claude-powered assistant with RAG knowledge base. Answers watering schedule, restriction, and citation questions instantly.',
  },
  {
    icon: '\u{1F4CA}',
    title: 'Reports & Analytics',
    body: 'Four executive report types with Recharts visualizations, date range filters, and CSV export for director briefings.',
  },
  {
    icon: '\u{1F4A7}',
    title: 'Reclaimed Water Incentives',
    body: 'Conversion incentive tracking with approval workflow. Measures adoption rate and cost avoidance in real time.',
  },
];

const bullets = [
  'SWFWMD Phase II compliant enforcement workflow',
  'FAC 40D-22 fine schedule built in',
  'Beacon AMI integration ready',
  'Okta / SAML 2.0 compatible (Phase 2)',
];

const roiStats = [
  { value: '520\u2013780 hrs', label: 'Staff hours recovered annually' },
  { value: '$18K\u2013$27K', label: 'Estimated cost avoidance per year' },
  { value: '70%', label: 'Reduction in manual review time' },
];

/* ── KPI Tile Component ────────────────────────────────── */
function KpiTile({ end, label, suffix = '', prefix = '', decimals = 0 }: {
  end: number; label: string; suffix?: string; prefix?: string; decimals?: number;
}) {
  const { ref, value } = useCountUp(end, 1500, decimals);
  return (
    <div
      ref={ref}
      className="rounded-xl px-6 py-5 text-center"
      style={{ background: '#1B3A6B' }}
    >
      <div className="text-3xl font-bold sm:text-4xl" style={{ color: '#006E8C' }}>
        {prefix}{decimals > 0 ? value.toFixed(decimals) : value}{suffix}
      </div>
      <div className="mt-1 text-sm" style={{ color: '#7FA8C0' }}>{label}</div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className={`${serif.variable} ${sans.variable}`} style={{ fontFamily: 'var(--font-body), sans-serif' }}>

      {/* ════════ HERO ════════ */}
      <section className="hero-bg relative flex min-h-screen flex-col overflow-hidden" style={{ background: '#0D1B2A' }}>
        {/* Animated background */}
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-particles" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="particle" style={{ '--i': i } as React.CSSProperties} />
          ))}
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight" style={{ color: '#006E8C', fontFamily: 'var(--font-body)' }}>
              ReUse360&trade; Plus
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(0,110,140,0.15)', color: '#006E8C', border: '1px solid rgba(0,110,140,0.3)' }}>
              Beta
            </span>
          </div>
          <div className="hidden text-sm sm:block" style={{ color: '#7FA8C0' }}>
            Pinellas County Utilities &middot; Water Conservation Division
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto flex flex-1 flex-col items-center justify-center px-6 text-center" style={{ maxWidth: 760 }}>
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium" style={{ border: '1px solid rgba(0,110,140,0.4)', color: '#006E8C' }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#006E8C' }} />
            Now Live &middot; PCU Water Conservation Division
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-normal leading-tight sm:text-5xl md:text-[56px] md:leading-[1.1]" style={{ fontFamily: 'var(--font-display), serif', color: '#FFFFFF' }}>
            Water Conservation{' '}
            <br className="hidden sm:block" />
            Enforcement,{' '}
            <br className="hidden sm:block" />
            <span style={{ color: '#006E8C' }}>Reimagined.</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: '#7FA8C0' }}>
            AI-powered patrol logging, violation tracking, and reclaimed water
            analytics&nbsp;&mdash; built for Pinellas County Utilities.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg px-7 py-3 text-base font-semibold text-white transition-all hover:brightness-110"
              style={{ background: '#006E8C' }}
            >
              Sign In to Platform &rarr;
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border px-7 py-3 text-base font-semibold transition-all hover:bg-white/5"
              style={{ borderColor: '#006E8C', color: '#006E8C' }}
            >
              View Live Demo
            </Link>
          </div>

          {/* KPI Row */}
          <div className="mt-14 grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {kpis.map((k) => (
              <KpiTile key={k.label} end={k.end} label={k.label} suffix={k.suffix} prefix={'prefix' in k ? k.prefix : ''} decimals={k.decimals} />
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-10 flex justify-center pb-8">
          <div className="scroll-hint h-10 w-6 rounded-full border-2" style={{ borderColor: 'rgba(127,168,192,0.3)' }}>
            <div className="scroll-dot mx-auto mt-1.5 h-2 w-1.5 rounded-full" style={{ background: '#7FA8C0' }} />
          </div>
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section className="px-6 py-20 sm:px-10 sm:py-28" style={{ background: '#F0F7FF' }}>
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-normal sm:text-4xl" style={{ fontFamily: 'var(--font-display), serif', color: '#1B3A6B' }}>
            Everything your team needs
          </h2>
          <p className="mx-auto mt-3 max-w-md text-center text-base" style={{ color: '#7FA8C0' }}>
            Six integrated modules. One enforcement platform.
          </p>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border-l-4 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                style={{ borderLeftColor: '#0D1B2A' }}
              >
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 text-lg font-semibold" style={{ color: '#0D1B2A' }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ ROI ════════ */}
      <section className="px-6 py-20 sm:px-10 sm:py-28" style={{ background: '#0D1B2A' }}>
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-5">
          {/* Left */}
          <div className="lg:col-span-3">
            <h2 className="text-3xl font-normal leading-tight text-white sm:text-4xl" style={{ fontFamily: 'var(--font-display), serif' }}>
              Built for municipal scale.
            </h2>
            <p className="mt-5 max-w-lg leading-relaxed" style={{ color: '#7FA8C0' }}>
              ReUse360&trade; Plus recovers 520&ndash;780 staff hours per year through
              automated violation detection, digital patrol logging, and
              AI-assisted enforcement. Designed for SWFWMD compliance and
              FAC&nbsp;40D-22 enforcement standards.
            </p>
            <ul className="mt-8 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm" style={{ color: '#7FA8C0' }}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'rgba(0,110,140,0.15)', color: '#006E8C' }}>
                    &#10003;
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {/* Right */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            {roiStats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border px-6 py-5"
                style={{ borderColor: 'rgba(0,110,140,0.3)', background: 'rgba(0,110,140,0.05)' }}
              >
                <div className="text-2xl font-bold sm:text-3xl" style={{ color: '#006E8C' }}>{s.value}</div>
                <div className="mt-1 text-sm" style={{ color: '#7FA8C0' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="bg-white px-6 py-16 text-center sm:py-20">
        <div className="text-xl font-bold tracking-tight" style={{ color: '#006E8C' }}>
          ReUse360&trade; Plus
        </div>
        <p className="mt-2 text-sm" style={{ color: '#7FA8C0' }}>
          Pinellas County Utilities &middot; Water Conservation Division &middot; 2026
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110"
          style={{ background: '#0D1B2A' }}
        >
          Sign In to Platform &rarr;
        </Link>
        <p className="mt-6 text-xs" style={{ color: '#7FA8C0' }}>
          For authorized PCU Water Conservation Division staff only.
        </p>
      </footer>

      {/* ════════ STYLES ════════ */}
      <style jsx global>{`
        /* Hero animated glow */
        .hero-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            ellipse 60% 50% at 50% 40%,
            rgba(0, 110, 140, 0.08) 0%,
            transparent 70%
          );
          animation: glowPulse 8s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }

        /* Floating particles */
        .hero-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(0, 110, 140, 0.3);
          animation: floatUp 12s linear infinite;
          left: calc(15% + var(--i) * 14%);
          animation-delay: calc(var(--i) * -2s);
        }
        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-20vh) scale(1); opacity: 0; }
        }

        /* Scroll indicator */
        .scroll-dot {
          animation: scrollBounce 2s ease-in-out infinite;
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(12px); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
