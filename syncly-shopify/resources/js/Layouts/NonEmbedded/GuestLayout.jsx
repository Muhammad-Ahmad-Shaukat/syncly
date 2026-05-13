/**
 * Minimal auth shell — Tailwind only (no MUI) so Vite dev stays reliable.
 */
export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                {children}
            </div>
        </div>
    );
}
