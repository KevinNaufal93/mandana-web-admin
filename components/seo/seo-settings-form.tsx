"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImagePicker, type ImagePickerValue } from "@/components/media/image-picker";
import { updateSeoSettingsAction } from "@/app/actions/seo";
import type { AdminSeoSettings } from "@/lib/seo/shared";

function Field({
  label,
  htmlFor,
  children,
  hint,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** The known platforms the public footer renders icons for — see
 *  site-footer-glass.tsx on the web side. An absent/blank value here
 *  means no icon, never a placeholder link. */
const SOCIAL_PLATFORMS: { key: string; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/mandana.property" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@mandana.property" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/mandanaproperty" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@mandanaproperty" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/mandanaproperty" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/mandanaproperty" },
];

export function SeoSettingsForm({ settings }: { settings: AdminSeoSettings }) {
  const [organizationName, setOrganizationName] = useState(settings.organizationName);
  const [contactPhone, setContactPhone] = useState(settings.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(settings.contactEmail ?? "");
  const [streetAddress, setStreetAddress] = useState(settings.streetAddress ?? "");
  const [addressLocality, setAddressLocality] = useState(settings.addressLocality ?? "");
  const [addressRegion, setAddressRegion] = useState(settings.addressRegion ?? "");
  const [postalCode, setPostalCode] = useState(settings.postalCode ?? "");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(settings.socialLinks);
  const [googleSiteVerification, setGoogleSiteVerification] = useState(settings.googleSiteVerification ?? "");
  const [bingSiteVerification, setBingSiteVerification] = useState(settings.bingSiteVerification ?? "");
  const [ogImage, setOgImage] = useState<ImagePickerValue>({
    mediaAssetId: null,
    preview: settings.defaultOgImage
      ? { url: settings.defaultOgImage.url, alt: settings.defaultOgImage.alt }
      : null,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function clearSuccess() {
    setSuccess(false);
  }

  function handleSubmit() {
    setError(null);
    setSuccess(false);

    if (organizationName.trim().length < 2) {
      setError("Nama organisasi minimal 2 karakter.");
      return;
    }

    startTransition(async () => {
      const result = await updateSeoSettingsAction({
        organizationName: organizationName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        streetAddress: streetAddress.trim(),
        addressLocality: addressLocality.trim(),
        addressRegion: addressRegion.trim(),
        postalCode: postalCode.trim(),
        socialLinks,
        googleSiteVerification: googleSiteVerification.trim(),
        bingSiteVerification: bingSiteVerification.trim(),
        defaultOgMediaAssetId: ogImage.mediaAssetId ?? undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border p-4">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && !pending && (
        <p role="status" className="text-sm text-primary">
          Perubahan tersimpan.
        </p>
      )}

      <div>
        <h2 className="text-sm font-semibold text-primary">Bisnis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dipakai Google untuk mengenali bisnis ini secara otomatis — penting karena nama &ldquo;Mandana Property&rdquo; juga
          dipakai perusahaan lain.
        </p>
        <div className="mt-3 flex flex-col gap-4">
          <Field label="Nama organisasi" htmlFor="seo-org-name">
            <Input
              id="seo-org-name"
              value={organizationName}
              onChange={(e) => {
                setOrganizationName(e.target.value);
                clearSuccess();
              }}
              disabled={pending}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Telepon" htmlFor="seo-phone">
              <Input
                id="seo-phone"
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value);
                  clearSuccess();
                }}
                placeholder="+6281234567890"
                disabled={pending}
              />
            </Field>
            <Field label="Email" htmlFor="seo-email">
              <Input
                id="seo-email"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  clearSuccess();
                }}
                placeholder="hello@mandana.id"
                disabled={pending}
              />
            </Field>
          </div>
          <Field label="Alamat" htmlFor="seo-address">
            <Input
              id="seo-address"
              value={streetAddress}
              onChange={(e) => {
                setStreetAddress(e.target.value);
                clearSuccess();
              }}
              placeholder="Jl. Boulevard Raya No. 1, BSD City"
              disabled={pending}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Kota" htmlFor="seo-city">
              <Input
                id="seo-city"
                value={addressLocality}
                onChange={(e) => {
                  setAddressLocality(e.target.value);
                  clearSuccess();
                }}
                disabled={pending}
              />
            </Field>
            <Field label="Provinsi" htmlFor="seo-province">
              <Input
                id="seo-province"
                value={addressRegion}
                onChange={(e) => {
                  setAddressRegion(e.target.value);
                  clearSuccess();
                }}
                disabled={pending}
              />
            </Field>
            <Field label="Kode pos" htmlFor="seo-postal">
              <Input
                id="seo-postal"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  clearSuccess();
                }}
                disabled={pending}
              />
            </Field>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-primary">Media sosial</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Menentukan ikon apa yang muncul di footer situs. Kosongkan platform yang belum ada — tidak akan tampil
          ikon rusak.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <Field key={platform.key} label={platform.label} htmlFor={`seo-social-${platform.key}`}>
              <Input
                id={`seo-social-${platform.key}`}
                value={socialLinks[platform.key] ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setSocialLinks((prev) => {
                    const next = { ...prev };
                    if (value.trim()) next[platform.key] = value;
                    else delete next[platform.key];
                    return next;
                  });
                  clearSuccess();
                }}
                placeholder={platform.placeholder}
                disabled={pending}
              />
            </Field>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-primary">Gambar berbagi bawaan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dipakai saat halaman lain tidak punya gambar sendiri — muncul ketika tautan situs dibagikan di WhatsApp
          atau Facebook.
        </p>
        <div className="mt-3">
          <ImagePicker
            value={ogImage}
            onChange={(next) => {
              setOgImage(next);
              clearSuccess();
            }}
            purpose="cover"
            label="Gambar"
            hint="Disarankan 1200 × 630 px."
            disabled={pending}
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-primary">Verifikasi mesin pencari</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kode verifikasi dari Google Search Console / Bing Webmaster Tools — tempel sekali, tidak tampil di
          situs.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Google Search Console" htmlFor="seo-google-verify">
            <Input
              id="seo-google-verify"
              value={googleSiteVerification}
              onChange={(e) => {
                setGoogleSiteVerification(e.target.value);
                clearSuccess();
              }}
              disabled={pending}
            />
          </Field>
          <Field label="Bing Webmaster Tools" htmlFor="seo-bing-verify">
            <Input
              id="seo-bing-verify"
              value={bingSiteVerification}
              onChange={(e) => {
                setBingSiteVerification(e.target.value);
                clearSuccess();
              }}
              disabled={pending}
            />
          </Field>
        </div>
      </div>

      <div>
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  );
}
