import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
      <div className="text-center">
        <p className="text-teal-500 text-sm font-semibold uppercase tracking-widest mb-2">403</p>
        <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-slate-400 mb-8 max-w-sm">
          You don't have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Go to my dashboard
        </Link>
      </div>
    </div>
  );
}
