import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import QRCode from 'qrcode';

type Guest = {
  id: string;
  token: string;
  status: 'invited'|'accepted'|'waitlisted'|'checked_in'|'denied';
  card_id: string|null;
  qr_image_url: string|null;
};

export async function POST(req: Request) {
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });

    // 1) Buscar invitado
    const { data: guest, error: gErr } = await supabase
      .from('guests')
      .select('*')
      .eq('token', token)
      .single<Guest>();
    if (gErr || !guest) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // Si ya respondió, responde idempotente
    if (guest.status === 'accepted' || guest.status === 'waitlisted') {
      const publicCardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/c/${guest.token}`;
      return NextResponse.json({
        ok: true,
        status: guest.status,
        card_id: guest.card_id,
        qr_image_url: guest.qr_image_url,
        card_url: publicCardUrl,
      });
    }

    // 2) Límite de RSVP
    const { data: settings } = await supabase
      .from('settings').select('value').eq('key','limits')
      .single<{ value: { rsvp_cap?: number } }>();
    const rsvpCap = settings?.value?.rsvp_cap ?? 80;

    const { count: acceptedCount } = await supabase
      .from('guests').select('*', { count:'exact', head:true })
      .eq('status','accepted');

    const isAccepted = (acceptedCount ?? 0) < rsvpCap;
    const nextStatus: Guest['status'] = isAccepted ? 'accepted' : 'waitlisted';

    // 3) Asignar carta si quedó accepted y no tiene
    let cardId = guest.card_id;
    if (isAccepted && !cardId) {
      const { data: freeCard } = await supabase
        .from('cards').select('id')
        .is('assigned_guest_id', null).limit(1).maybeSingle<{ id: string }>();
      if (freeCard?.id) {
        cardId = freeCard.id;
        await supabase.from('cards')
          .update({ assigned_guest_id: guest.id, assigned_at: new Date().toISOString() })
          .eq('id', cardId);
      }
    }

    // 4) Generar QR con URL pública de la carta
    const publicCardUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/c/${guest.token}`;
    const qrDataUrl = await QRCode.toDataURL(publicCardUrl);

    // 5) Guardar
    const { data: updated, error: uErr } = await supabase
      .from('guests')
      .update({
        status: nextStatus,
        rsvp_at: new Date().toISOString(),
        card_id: cardId ?? null,
        qr_image_url: qrDataUrl,
      })
      .eq('id', guest.id)
      .select('status, card_id, qr_image_url')
      .single();
    if (uErr || !updated) return NextResponse.json({ error: 'update failed' }, { status: 500 });

    return NextResponse.json({
      ok: true,
      status: updated.status,
      card_id: updated.card_id,
      qr_image_url: updated.qr_image_url,
      card_url: publicCardUrl,
    });
  } catch (e) {
    console.error('RSVP error:', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
