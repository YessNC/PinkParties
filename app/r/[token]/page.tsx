'use client';
import { useState } from 'react';

export default function RSVPPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    const r = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token }),
    });
    const d = await r.json();
    setState(d);
    setLoading(false);
  };

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">Confirmar asistencia</h1>

        {!state && (
          <button
            onClick={confirm}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </button>
        )}

        {state?.ok && state?.status === 'accepted' && (
          <div className="space-y-3">
            <p>🎉 ¡Listo! Estás confirmado.</p>
            <a
              href={`/c/${params.token}`}
              className="underline hover:text-pink-400"
            >
              Ver tu carta con QR
            </a>
            <img
              src={state.qr_image_url}
              alt="QR"
              className="mx-auto w-40 h-40 bg-white p-2 rounded"
            />
          </div>
        )}

        {state && state.status === 'waitlisted' && (
          <p>😅 Quedaste en lista de espera. Te avisaremos si se libera un cupo.</p>
        )}

        {state?.error && (
          <p className="text-red-400">Error: {state.error}</p>
        )}
      </div>
    </main>
  );
}
