'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import { useAuth, useUser } from '@clerk/nextjs';

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

/* ── Deterministic particle positions (avoids Math.random SSR/client mismatch) */
const PARTICLE_POSITIONS = [
  { left: 12, top: 8 }, { left: 87, top: 23 }, { left: 34, top: 67 }, { left: 56, top: 12 },
  { left: 78, top: 89 }, { left: 23, top: 45 }, { left: 91, top: 56 }, { left: 45, top: 34 },
  { left: 67, top: 78 }, { left: 5, top: 91 }, { left: 38, top: 15 }, { left: 72, top: 42 },
  { left: 15, top: 63 }, { left: 83, top: 7 }, { left: 50, top: 50 }, { left: 28, top: 82 },
  { left: 62, top: 28 }, { left: 95, top: 71 }, { left: 8, top: 38 }, { left: 42, top: 95 },
];
const PARTICLE_DELAYS = [
  -3.2, -7.1, -1.5, -9.8, -4.6, -11.3, -0.8, -6.4, -2.9, -8.7,
  -5.1, -10.5, -3.8, -7.6, -1.2, -9.0, -4.3, -11.8, -6.9, -2.4,
];

/* ── KPI counter hook ──────────────────────────────────── */
function useCountUp(end: number, duration = 1500, decimals = 0) {
  const [value, setValue] = useState(end);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    // Reset to 0 on mount so the animation runs from 0 → end
    setValue(0);
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
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

  return { value, ref };
}

/* ── Feature data ──────────────────────────────────────── */
const features = [
  {
    icon: '💧',
    title: 'Monitor',
    desc: 'Unify multi-vendor AMI data to surface leaks, continuous flow, outdoor-use patterns, unusual demand, and emerging trends.',
  },
  {
    icon: '💬',
    title: 'Engage',
    desc: 'Send relevant alerts, summaries, watering guidance, and multilingual campaigns—then measure response and savings.',
  },
  {
    icon: '🤝',
    title: 'Assist',
    desc: 'Give customer-service teams a complete use history, probable high-bill causes, program eligibility, and the next best action.',
  },
  {
    icon: '🌱',
    title: 'Programs',
    desc: 'Coordinate rebates, audits, site visits, and conservation kits while tracking participation, equity, cost, and gallons saved.',
  },
  {
    icon: '🛡️',
    title: 'Comply & Enforce',
    desc: 'When policy calls for it, validate schedules, preserve evidence, manage notices and appeals, and maintain a complete audit trail.',
  },
  {
    icon: '📈',
    title: 'Measure',
    desc: 'Report savings, reach, leak-resolution time, peak-demand reduction, program conversion, compliance, and staff time recovered.',
  },
];

/* ── Page ──────────────────────────────────────────────── */
export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const timer = setTimeout(() => {
        const role = (user.publicMetadata as { role?: string })?.role;
        const routes: Record<string, string> = {
          ADMIN: '/admin',
          ANALYST: '/analyst/dashboard',
          ENFORCEMENT: '/enforcement/dashboard',
        };
        router.push(routes[role ?? ''] ?? '/admin');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, isSignedIn, user, router]);

  const staffHours = useCountUp(520, 2000);
  const costAvoidance = useCountUp(147, 2000);
  const reviewReduction = useCountUp(83, 1800);
  const compliance = useCountUp(91.2, 1600, 1);

  return (
    <div className={`${serif.variable} ${sans.variable} overflow-x-hidden font-sans`}>
      {/* ─── HERO ─────────────────────────────────────── */}
      <section
        className="hero-bg relative flex min-h-[88svh] flex-col overflow-hidden"
        style={{ background: '#0D1B2A' }}
      >
        <div className="hero-glow" aria-hidden="true" suppressHydrationWarning />
        <div className="hero-particles" aria-hidden="true">
          {PARTICLE_POSITIONS.map((pos, i) => (
            <span
              key={i}
              className="particle"
              style={{ left: `${pos.left}%`, top: `${pos.top}%`, animationDelay: `${PARTICLE_DELAYS[i]}s` }}
            />
          ))}
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex w-full items-center justify-between px-6 py-5 sm:px-10">
          <span
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: '#5CC8DB' }}
          >
            ReUse360<span className="text-white/60">+</span>
          </span>
          <Link
            href="/sign-in"
            className="rounded-full px-5 py-2 text-sm font-semibold transition"
            style={{ background: '#006E8C', color: '#fff' }}
          >
            Sign In
          </Link>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center px-5 py-14 text-center sm:px-6 sm:py-16">
          <h1
            className="w-full max-w-[19rem] text-[2rem] leading-[1.08] sm:max-w-3xl sm:text-6xl sm:leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: '#FFFFFF' }}
          >
            Turn AMI data into{' '}
            <span className="block" style={{ color: '#5CC8DB' }}>conservation action.</span>
          </h1>
          <p className="mt-5 w-full max-w-[19rem] text-sm leading-6 text-white/70 sm:max-w-xl sm:text-lg sm:leading-relaxed">
            ReUse360 Plus helps utilities monitor water use, engage customers,
            manage conservation programs, assist staff, and automate compliance
            when their operating model calls for it.
          </p>
          <div className="mt-8 flex w-full max-w-[19rem] flex-wrap justify-center gap-3 sm:max-w-sm sm:gap-4">
            <Link
              href="/demo"
              className="rounded-full px-7 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ background: '#006E8C', color: '#fff' }}
            >
              Explore the synthetic demo
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-5">
          <div className="h-10 w-6 rounded-full border-2 border-white/30 p-1">
            <div className="scroll-dot mx-auto h-2 w-1.5 rounded-full bg-white/60" />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────── */}
      <section id="features" className="bg-gray-50 px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <h2
            className="mx-auto max-w-[18rem] text-center text-2xl leading-tight sm:max-w-none sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)', color: '#0D1B2A' }}
          >
            A complete conservation operating system
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-500">
            Start with the outcome your utility needs today. Add modules as your
            program, policy, and customer-service model evolve.
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
                style={{ borderLeftColor: '#0D1B2A', borderLeftWidth: 3 }}
              >
                <span className="text-3xl">{f.icon}</span>
                <h3
                  className="mt-3 text-lg font-semibold"
                  style={{ color: '#0D1B2A' }}
                >
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PHASE III SPOTLIGHT ─────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-28" style={{ background: '#FFFFFF' }}>
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: '#006E8C' }}>
            Choose your utility&apos;s goal
          </p>
          <h2
            className="mt-3 text-center text-3xl sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)', color: '#0D1B2A' }}
          >
            The same data can support different action.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-500">
            Inform, assist, incentivize, investigate, or enforce. ReUse360 Plus
            adapts to the way your utility serves its community.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: 'Monitor water use', d: 'Find leaks, continuous flow, high use, irrigation patterns, and emerging demand across the service area.' },
              { t: 'Engage customers', d: 'Create targeted outreach, personalized summaries, alerts, and practical next steps.' },
              { t: 'Manage programs', d: 'Match customers to rebates and audits, coordinate follow-up, and verify savings.' },
              { t: 'Automate compliance', d: 'Validate rules and manage evidence, warnings, penalties, and appeals as an optional workflow.' },
            ].map((p) => (
              <div key={p.t} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>{p.t}</h3>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROI / STATS ─────────────────────────────── */}
      <section
        className="px-6 py-20 sm:px-10 sm:py-28"
        style={{ background: '#0D1B2A' }}
      >
        <div className="mx-auto max-w-5xl text-center">
          <h2
            className="text-3xl sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)', color: '#FFFFFF' }}
          >
            Projected Program Impact
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            A synthetic preview of the outcomes utility teams can manage in one
            place. Every deployment establishes its own baselines and targets.
          </p>
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { ref: staffHours.ref, val: `${staffHours.value}`, label: 'Modeled Staff Hours Recovered / Year' },
              { ref: costAvoidance.ref, val: `$${costAvoidance.value}K`, label: 'Modeled Program Value / Year' },
              { ref: reviewReduction.ref, val: `${reviewReduction.value}%`, label: 'Modeled Reduction in Manual Review' },
              { ref: compliance.ref, val: `${compliance.value}%`, label: 'Synthetic Customer Response Rate' },
            ].map((s) => (
              <div key={s.label} ref={s.ref}>
                <div
                  className="text-4xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: '#5CC8DB' }}
                  suppressHydrationWarning
                >
                  {s.val}
                </div>
                <div className="mt-2 text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-xs leading-relaxed text-white/40">
            Demonstration figures are synthetic planning estimates, not customer
            results or guarantees. Actual outcomes vary with service-area size,
            AMI coverage, program design, staffing, climate, and customer response.
          </p>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="bg-gray-50 px-6 py-20 text-center sm:px-10 sm:py-28">
        <h2
          className="text-3xl sm:text-4xl"
          style={{ fontFamily: 'var(--font-display)', color: '#0D1B2A' }}
        >
          Bring ReUse360+ to Your Utility
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-gray-500">
          Start with your AMI data and the outcome that matters most—leak response,
          customer engagement, program participation, demand reduction, or
          configurable compliance.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
          <Link
            href="/demo"
            className="inline-block rounded-full px-8 py-3.5 text-sm font-semibold transition hover:opacity-90"
            style={{ background: '#0D1B2A', color: '#fff' }}
          >
            Explore the Demo
          </Link>
          <a
            href="mailto:frankrobersonl@gmail.com?subject=ReUse360%2B%20Pilot%20Inquiry"
            className="inline-block rounded-full px-8 py-3.5 text-sm font-semibold transition hover:opacity-90"
            style={{ background: '#006E8C', color: '#fff' }}
          >
            Request a Pilot
          </a>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────── */}
      <footer
        className="px-6 py-6 text-center text-xs text-white/40"
        style={{ background: '#0D1B2A' }}
        suppressHydrationWarning
      >
        &copy; {new Date().getFullYear()} ReUse360Plus LLC &middot; Tampa Bay, Florida
      </footer>

      {/* ─── Styles ───────────────────────────────────── */}
      <style jsx>{`
        .hero-glow {
          position: absolute;
          top: -40%;
          left: 50%;
          width: 140%;
          height: 120%;
          transform: translateX(-50%);
          background: radial-gradient(
            ellipse at center,
            rgba(92, 200, 219, 0.08) 0%,
            transparent 70%
          );
          pointer-events: none;
        }
        .hero-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(92, 200, 219, 0.3);
          border-radius: 50%;
          animation: float 12s infinite ease-in-out;
        }
        .particle:nth-child(odd) {
          animation-duration: 16s;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-40px) scale(1.5); opacity: 0.6; }
        }
        .scroll-dot {
          animation: scroll-bounce 2s infinite;
        }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(12px); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}
