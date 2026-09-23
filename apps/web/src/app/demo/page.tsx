'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, BarChart3, BellRing, Check, ChevronDown, CircleDollarSign,
  Droplets, Gauge, Leaf, MessageSquareText, Search, ShieldCheck, Sparkles, Target,
  TrendingDown, Users, Wrench,
} from 'lucide-react';

type Goal = 'monitor' | 'engage' | 'programs' | 'comply';

const goals: Array<{
  id: Goal; label: string; eyebrow: string; title: string; description: string;
  action: string; icon: React.ElementType;
}> = [
  { id: 'monitor', label: 'Monitor water use', eyebrow: 'Monitor', title: 'Find the conservation signal in every meter read.', description: 'Detect continuous flow, outdoor-use patterns, unusual demand, and neighborhood-level change across any AMI system.', action: 'Review priority accounts', icon: Activity },
  { id: 'engage', label: 'Engage customers', eyebrow: 'Engage', title: 'Turn a pattern into the right customer action.', description: 'Build a target segment, choose a helpful message, and measure what changed after the alert—not just whether it was sent.', action: 'Launch helpful outreach', icon: MessageSquareText },
  { id: 'programs', label: 'Manage programs', eyebrow: 'Programs', title: 'Put rebates and audits where they save the most.', description: 'Match customers to eligible programs, coordinate follow-up, and compare gallons saved with program cost and participation.', action: 'Open program pipeline', icon: CircleDollarSign },
  { id: 'comply', label: 'Automate compliance', eyebrow: 'Comply & Enforce', title: 'Apply rules consistently when enforcement is needed.', description: 'Validate schedules, preserve evidence, manage warnings and appeals, and keep a complete audit trail without making citations the default.', action: 'Review validated cases', icon: ShieldCheck },
];

const accounts = [
  { id: 'A-104', area: 'North Ridge', class: 'Residential', signal: 'Continuous flow', use: 462, change: 38, status: 'Needs outreach', color: '#ef8354' },
  { id: 'A-287', area: 'River East', class: 'Residential', signal: 'Outdoor pattern', use: 395, change: 26, status: 'Rebate eligible', color: '#e0a82e' },
  { id: 'A-412', area: 'Civic Core', class: 'Commercial', signal: 'Unusual high use', use: 822, change: 19, status: 'Audit recommended', color: '#4f8fc0' },
  { id: 'A-518', area: 'South Mesa', class: 'Residential', signal: 'Post-alert decline', use: 218, change: -17, status: 'Responded', color: '#2a9d78' },
];

const chartPoints = '0,76 42,63 84,66 126,42 168,52 210,30 252,37 294,16 336,27 378,20 420,36 462,22 504,28 546,12';

function GoalIcon({ goal, className = 'h-5 w-5' }: { goal: Goal; className?: string }) {
  const Icon = goals.find((item) => item.id === goal)?.icon ?? Activity;
  return <Icon className={className} aria-hidden="true" />;
}

export default function DemoPage() {
  const [goal, setGoal] = useState<Goal>('monitor');
  const [filter, setFilter] = useState('All priority signals');
  const [reduction, setReduction] = useState(10);
  const [selected, setSelected] = useState<string[]>(['A-104', 'A-287']);
  const [launched, setLaunched] = useState(false);
  const current = goals.find((item) => item.id === goal) ?? goals[0];
  const modeledSavings = Math.round(18.4 * (reduction / 10));
  const modeledAccounts = Math.round(12640 * (reduction / 10));
  const visibleAccounts = useMemo(() => {
    if (filter === 'Leak risk') return accounts.filter((item) => item.signal === 'Continuous flow');
    if (filter === 'Outdoor use') return accounts.filter((item) => item.signal === 'Outdoor pattern');
    if (filter === 'Nonresponse') return accounts.filter((item) => item.status === 'Needs outreach');
    return accounts;
  }, [filter]);

  const toggleAccount = (id: string) => {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
    setLaunched(false);
  };

  return (
    <main className="min-h-screen bg-[#f3f7f7] text-[#123038]">
      <header className="border-b border-[#d8e5e3] bg-white/95">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="ReUse360 Plus home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0b6b68] text-white"><Droplets className="h-5 w-5" /></span>
            <span><span className="block text-sm font-extrabold tracking-tight">ReUse360 Plus</span><span className="block text-[10px] font-semibold uppercase tracking-[0.19em] text-[#547077]">Synthetic utility workspace</span></span>
          </Link>
          <div className="flex items-center gap-2"><span className="hidden rounded-full bg-[#e8f5f1] px-3 py-1.5 text-xs font-bold text-[#146b59] sm:inline-flex">No customer PII</span><Link href="/sign-in" className="rounded-full border border-[#b8cdca] px-4 py-2 text-sm font-bold text-[#24464d] transition hover:border-[#0b6b68] hover:text-[#0b6b68]">Sign in</Link></div>
        </div>
      </header>

      <section className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0b7773]">Choose your utility&apos;s goal</p><h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-0.04em] text-[#102e35] sm:text-4xl">One operating picture. Many ways to act.</h1><p className="mt-3 max-w-3xl text-base leading-7 text-[#567078]">Explore how the same AMI signal can support monitoring, assistance, programs, customer engagement, or compliance. All figures and accounts below are synthetic.</p></div>
          <div className="flex items-center gap-2 text-sm font-bold text-[#365860]"><span className="h-2.5 w-2.5 rounded-full bg-[#2ea67d]" />Demo data refreshed 8 min ago</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="Utility goals">
          {goals.map((item) => { const Icon = item.icon; const active = item.id === goal; return (
            <button key={item.id} role="tab" aria-selected={active} onClick={() => { setGoal(item.id); setLaunched(false); }} className={`group flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition ${active ? 'border-[#0b7773] bg-[#0c716d] text-white shadow-[0_14px_36px_rgba(13,104,101,.18)]' : 'border-[#d3e1df] bg-white text-[#214149] hover:-translate-y-0.5 hover:border-[#8eb9b3]'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-white/15' : 'bg-[#e9f5f2] text-[#0b7773]'}`}><Icon className="h-5 w-5" /></span><span><span className="block text-sm font-extrabold">{item.label}</span><span className={`mt-1 block text-xs leading-5 ${active ? 'text-white/70' : 'text-[#6a8186]'}`}>{item.eyebrow} workspace</span></span>
            </button>
          ); })}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
          <section className="overflow-hidden rounded-[26px] border border-[#d3e1df] bg-white shadow-[0_20px_60px_rgba(31,65,71,.08)]">
            <div className="flex flex-col gap-4 border-b border-[#e0e9e8] p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e4f3ef] text-[#0b7773]"><GoalIcon goal={goal} /></span><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#0b7773]">{current.eyebrow}</p><h2 className="mt-1 text-xl font-black tracking-tight text-[#15343b]">{current.title}</h2></div></div>
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#122f36] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#0b7773]" onClick={() => setLaunched(true)}>{current.action}<ArrowRight className="h-4 w-4" /></button>
            </div>

            <div className="grid gap-px bg-[#e0e9e8] sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['System demand', '8.42 MGD', '-6.8% vs baseline', Droplets], ['Priority signals', '184', '37 new today', BellRing],
                ['Customers reached', '12,640', '74% opened', Users], ['Verified savings', '18.4 MG', 'rolling 90 days', TrendingDown],
              ].map(([label, value, detail, Icon]) => (
                <div key={String(label)} className="bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.11em] text-[#71878c]">{String(label)}</p>{typeof Icon !== 'string' && <Icon className="h-4 w-4 text-[#0d817b]" />}</div><p className="mt-3 text-2xl font-black tracking-tight text-[#15343b]">{String(value)}</p><p className="mt-1 text-xs font-semibold text-[#668087]">{String(detail)}</p></div>
              ))}
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(250px,.7fr)]">
              <div className="rounded-2xl border border-[#dce7e6] bg-[#fbfdfd] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold text-[#173940]">Daily demand by customer segment</h3><p className="mt-1 text-xs text-[#71868b]">Weather-normalized • synthetic service area</p></div><span className="rounded-lg bg-[#e8f5f1] px-2.5 py-1 text-xs font-bold text-[#196d5c]">7-day forecast: -3.2%</span></div>
                <div className="mt-6 h-48 w-full" aria-label="Synthetic water demand trend chart"><svg viewBox="0 0 546 105" className="h-full w-full overflow-visible" role="img">{[18, 50, 82].map((y) => <line key={y} x1="0" x2="546" y1={y} y2={y} stroke="#dbe7e5" strokeDasharray="4 6" />)}<path d={`M ${chartPoints.replaceAll(' ', ' L ')} L 546,105 L 0,105 Z`} fill="url(#area)" opacity=".75" /><polyline points={chartPoints} fill="none" stroke="#0d817b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#45b5a4" stopOpacity=".35"/><stop offset="1" stopColor="#45b5a4" stopOpacity="0"/></linearGradient></defs></svg></div>
                <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-wider text-[#7d9297]"><span>Sep 10</span><span>Sep 16</span><span>Sep 23</span></div>
              </div>

              <div className="rounded-2xl bg-[#12343b] p-5 text-white">
                <div className="flex items-center gap-2 text-[#83d6c7]"><Sparkles className="h-4 w-4" /><p className="text-xs font-extrabold uppercase tracking-[0.16em]">Scenario model</p></div><h3 className="mt-4 text-lg font-black">Reduce outdoor use by {reduction}%</h3><input className="mt-5 w-full accent-[#65d2be]" type="range" min="5" max="25" step="5" value={reduction} onChange={(event) => setReduction(Number(event.target.value))} aria-label="Outdoor use reduction percentage" /><div className="mt-2 flex justify-between text-xs text-white/50"><span>5%</span><span>25%</span></div>
                <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/10 p-3"><p className="text-xl font-black">{modeledSavings.toFixed(1)} MG</p><p className="mt-1 text-[11px] text-white/60">annual savings</p></div><div className="rounded-xl bg-white/10 p-3"><p className="text-xl font-black">{modeledAccounts.toLocaleString()}</p><p className="mt-1 text-[11px] text-white/60">accounts targeted</p></div></div><p className="mt-4 text-xs leading-5 text-white/55">Planning estimate based on synthetic seasonal-use patterns; not a guaranteed forecast.</p>
              </div>
            </div>

            <div className="border-t border-[#e0e9e8] p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="font-extrabold text-[#173940]">Priority account segment</h3><p className="mt-1 text-xs text-[#71868b]">Drill from the service area to an account without exposing real customer data.</p></div><label className="relative"><span className="sr-only">Filter priority accounts</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="appearance-none rounded-xl border border-[#cbdcda] bg-white py-2.5 pl-3 pr-9 text-sm font-bold text-[#31535a]"><option>All priority signals</option><option>Leak risk</option><option>Outdoor use</option><option>Nonresponse</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#617b80]" /></label></div>
              <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm"><thead><tr className="text-xs uppercase tracking-[0.1em] text-[#73898e]"><th className="border-b border-[#e0e9e8] px-3 py-3">Select</th><th className="border-b border-[#e0e9e8] px-3 py-3">Synthetic account</th><th className="border-b border-[#e0e9e8] px-3 py-3">Area / class</th><th className="border-b border-[#e0e9e8] px-3 py-3">Signal</th><th className="border-b border-[#e0e9e8] px-3 py-3">Use</th><th className="border-b border-[#e0e9e8] px-3 py-3">Next action</th></tr></thead><tbody>
                {visibleAccounts.map((account) => <tr key={account.id} className="hover:bg-[#f6faf9]"><td className="border-b border-[#edf2f1] px-3 py-3"><button onClick={() => toggleAccount(account.id)} aria-label={`${selected.includes(account.id) ? 'Deselect' : 'Select'} account ${account.id}`} className={`grid h-5 w-5 place-items-center rounded border ${selected.includes(account.id) ? 'border-[#0b7773] bg-[#0b7773] text-white' : 'border-[#b7cbc8] bg-white'}`}>{selected.includes(account.id) && <Check className="h-3.5 w-3.5" />}</button></td><td className="border-b border-[#edf2f1] px-3 py-3 font-extrabold text-[#1c4148]">{account.id}</td><td className="border-b border-[#edf2f1] px-3 py-3"><span className="block font-bold text-[#36575e]">{account.area}</span><span className="text-xs text-[#7b8f93]">{account.class}</span></td><td className="border-b border-[#edf2f1] px-3 py-3"><span className="inline-flex items-center gap-2 font-bold text-[#36575e]"><span className="h-2 w-2 rounded-full" style={{ background: account.color }} />{account.signal}</span></td><td className="border-b border-[#edf2f1] px-3 py-3"><span className="font-extrabold text-[#24474e]">{account.use} gal</span><span className={`ml-2 text-xs font-bold ${account.change < 0 ? 'text-[#25815f]' : 'text-[#ba5b35]'}`}>{account.change > 0 ? '+' : ''}{account.change}%</span></td><td className="border-b border-[#edf2f1] px-3 py-3"><span className="rounded-full bg-[#edf5f3] px-2.5 py-1 text-xs font-bold text-[#31655c]">{account.status}</span></td></tr>)}
              </tbody></table></div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[26px] border border-[#d3e1df] bg-white p-5 shadow-[0_20px_60px_rgba(31,65,71,.06)]">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f5f1] text-[#0b7773]"><Target className="h-5 w-5" /></span><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#0b7773]">Recommended action</p><h2 className="font-black text-[#18383f]">{selected.length} accounts selected</h2></div></div><p className="mt-4 text-sm leading-6 text-[#5f797f]">{current.description}</p>
              <div className="mt-5 space-y-3">{goal === 'monitor' && <ActionRows items={[[Gauge, 'Review hourly flow', 'Confirm probable leak windows'], [Search, 'Compare similar properties', 'Normalize for class and season'], [Wrench, 'Offer leak assistance', 'Move from signal to resolution']]} />}{goal === 'engage' && <ActionRows items={[[MessageSquareText, 'Send high-use summary', 'Email + portal message'], [BellRing, 'Schedule follow-up', 'Check behavior after 7 days'], [BarChart3, 'Measure response', 'Track use change by segment']]} />}{goal === 'programs' && <ActionRows items={[[CircleDollarSign, 'Match eligibility', 'Audit or smart-irrigation rebate'], [Users, 'Check participation equity', 'Compare reach by service area'], [Leaf, 'Verify savings', 'Measure post-install performance']]} />}{goal === 'comply' && <ActionRows items={[[ShieldCheck, 'Validate rule window', 'Confirm schedule and exceptions'], [BellRing, 'Start with a warning', 'Escalation remains configurable'], [BarChart3, 'Preserve audit trail', 'Evidence, notice, appeal, outcome']]} />}</div>
              <button onClick={() => setLaunched(true)} disabled={selected.length === 0} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b7773] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#075c59] disabled:cursor-not-allowed disabled:opacity-40">{current.action}<ArrowRight className="h-4 w-4" /></button>{launched && <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#e9f7f1] p-3 text-sm font-bold text-[#17674f]" role="status"><Check className="mt-0.5 h-4 w-4 shrink-0" />Demo workflow prepared for {selected.length} synthetic accounts.</div>}
            </section>

            <section className="rounded-[26px] bg-[#ddf0eb] p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#2b7466]">Unified timeline</p><h2 className="mt-1 font-black text-[#173940]">Synthetic account A-104</h2></div><span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-[#38685f]">Residential</span></div><ol className="mt-5 space-y-4 border-l border-[#9dc9bf] pl-4"><Timeline time="Today, 8:10 AM" title="Continuous flow detected" detail="11.2 gal/hr for 19 hours" /><Timeline time="Yesterday" title="Customer summary viewed" detail="Portal visit from alert link" /><Timeline time="Sep 17" title="Leak-check guide sent" detail="English • email + SMS" /><Timeline time="Sep 11" title="Use crossed goal threshold" detail="Customer-set goal: 8,000 gal/month" /></ol></section>
          </aside>
        </div>

        <footer className="flex flex-col gap-3 py-8 text-sm text-[#617980] sm:flex-row sm:items-center sm:justify-between"><p>This interactive preview uses synthetic data and modeled outcomes.</p><Link href="/" className="inline-flex items-center gap-2 font-extrabold text-[#0b7773]">Explore the full platform <ArrowRight className="h-4 w-4" /></Link></footer>
      </section>
    </main>
  );
}

function ActionRows({ items }: { items: Array<[React.ElementType, string, string]> }) {
  return <>{items.map(([Icon, title, detail]) => <div key={title} className="flex items-start gap-3 rounded-xl border border-[#e1eae9] p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0b7773]" /><div><p className="text-sm font-extrabold text-[#294b52]">{title}</p><p className="mt-0.5 text-xs text-[#74898e]">{detail}</p></div></div>)}</>;
}

function Timeline({ time, title, detail }: { time: string; title: string; detail: string }) {
  return <li className="relative"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#ddf0eb] bg-[#0b7773]" /><p className="text-[11px] font-bold uppercase tracking-wider text-[#65847d]">{time}</p><p className="mt-1 text-sm font-extrabold text-[#254a50]">{title}</p><p className="mt-0.5 text-xs text-[#5f7974]">{detail}</p></li>;
}
