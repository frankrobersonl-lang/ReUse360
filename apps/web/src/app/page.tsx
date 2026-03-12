'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import { useAuth } from '@clerk/nextjs';

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
    title: 'AMI Violation Detection',
    desc: 'Automatic watering schedule enforcement using Beacon AMA smart meter data with 15-minute granularity.',
  },
  {
    icon: '📊',
    title: 'Real-Time Analytics',
    desc: 'Live dashboards tracking water usage, violations, and conservation metrics across all zones.',
  },
  {
    icon: '🗺️',
    title: 'GIS-Powered Mapping',
    desc: 'Interactive maps showing parcels, meters, violations, and inspection routes with PostGIS integration.',
  },
  {
    icon: '🔗',
    title: 'Cityworks Integration',
    desc: 'Seamless service request creation and tracking through direct Cityworks REST API connectivity.',
  },
];

/* ── Page ──────────────────────────────────────────────── */
export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  const staffHours = useCountUp(780, 2000);
  const costAvoidance = useCountUp(27, 2000);
  const reviewReduction = useCountUp(70, 1800);
  const compliance = useCountUp(91.2, 1600, 1);

  return (
    <div className={`${serif.variable} ${sans.variable} font-sans`}>
      {/* ─── HERO ─────────────────────────────────────── */}
      <section
        className="hero-bg relative flex min-h-screen flex-col overflow-hidden"
        style={{ background: '#0D1B2A' }}
      >
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-particles" aria-hidden="true">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="particle" />
          ))}
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
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
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1
            className="max-w-3xl text-4xl leading-tight sm:text-6xl sm:leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: '#FFFFFF' }}
          >
            Water Conservation,{' '}
            <span style={{ color: '#006E8C' }}>Reimagined.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
            AMI-driven irrigation enforcement and reclaimed water conservation
            for Pinellas County Utilities — powered by smart meter intelligence.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/sign-in"
              className="rounded-full px-7 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ background: '#006E8C', color: '#fff' }}
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8">
          <div className="h-10 w-6 rounded-full border-2 border-white/30 p-1">
            <div className="scroll-dot mx-auto h-2 w-1.5 rounded-full bg-white/60" />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────── */}
      <section id="features" className="bg-gray-50 px-6 py-20 sm:px-10 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-center text-3xl sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)', color: '#0D1B2A' }}
          >
            Intelligent Enforcement Platform
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-500">
            Six integrated modules working together to detect violations,
            manage inspections, and conserve millions of gallons annually.
          </p>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
            Proven Results
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            Real impact across Pinellas County&apos;s water conservation program.
          </p>
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { ref: staffHours.ref, val: `520–${staffHours.value}`, label: 'Staff Hours Recovered Annually' },
              { ref: costAvoidance.ref, val: `$${costAvoidance.value}K`, label: 'Estimated Cost Avoidance/Year' },
              { ref: reviewReduction.ref, val: `${reviewReduction.value}%`, label: 'Manual Review Time Reduced' },
              { ref: compliance.ref, val: `${compliance.value}%`, label: 'Compliance Rate' },
            ].map((s) => (
              <div key={s.label} ref={s.ref}>
                <div
                  className="text-4xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: '#5CC8DB' }}
                >
                  {s.val}
                </div>
                <div className="mt-2 text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="bg-gray-50 px-6 py-20 text-center sm:px-10 sm:py-28">
        <h2
          className="text-3xl sm:text-4xl"
          style={{ fontFamily: 'var(--font-display)', color: '#0D1B2A' }}
        >
          Ready to Transform Water Conservation?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-gray-500">
          Join Pinellas County Utilities in leading smart, data-driven irrigation enforcement.
        </p>
        <Link
          href="/sign-in"
          className="mt-8 inline-block rounded-full px-8 py-3.5 text-sm font-semibold transition hover:opacity-90"
          style={{ background: '#0D1B2A', color: '#fff' }}
        >
          Sign In to Your Dashboard
        </Link>
      </section>

      {/* ─── Footer ───────────────────────────────────── */}
      <footer
        className="px-6 py-6 text-center text-xs text-white/40"
        style={{ background: '#0D1B2A' }}
      >
        &copy; {new Date().getFullYear()} ReUse360+ &middot; Pinellas County Utilities
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
        ${Array.from({ length: 20 })
          .map(
            (_, i) => `
          .particle:nth-child(${i + 1}) {
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${(Math.random() * -12).toFixed(1)}s;
          }`,
          )
          .join('')}
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
