import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500 shadow-lg shadow-teal-500/30 mb-4">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8 2 4 6 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4-4-8-8-8z"/>
              <circle cx="12" cy="10" r="2.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ReUse360 Plus</h1>
          <p className="text-slate-400 text-sm mt-1">Request access from your administrator</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card:    'rounded-2xl shadow-2xl border border-slate-700/50 bg-slate-800/80 backdrop-blur',
              formButtonPrimary: 'bg-teal-600 hover:bg-teal-500',
            },
          }}
        />
      </div>
    </div>
  );
}
