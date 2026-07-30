import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SettingsFormData } from '@/lib/admin/settings';

interface ContactSocialSettingsProps {
  form: UseFormReturn<SettingsFormData>;
}

const socialFields = [
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
  {
    key: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/...',
  },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/...' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  {
    key: 'soundcloud',
    label: 'SoundCloud',
    placeholder: 'https://soundcloud.com/...',
  },
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
  { key: 'threads', label: 'Threads', placeholder: 'https://threads.net/@...' },
] as const;

export function ContactSocialSettings({ form }: ContactSocialSettingsProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label htmlFor="contact.email">Email</Label>
          <Input
            id="contact.email"
            type="email"
            placeholder="hello@example.com"
            {...register('contact.email')}
          />
          {errors.contact?.email && (
            <p className="mt-1 text-sm text-red-600">
              {errors.contact.email.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="contact.phone">Phone</Label>
          <Input
            id="contact.phone"
            type="tel"
            placeholder="+82 10-0000-0000"
            {...register('contact.phone')}
          />
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-5">
        <h3 className="mb-1 font-semibold text-stone-900">Social Links</h3>
        <p className="mb-5 text-sm text-stone-600">
          입력한 채널만 푸터 및 연락처 페이지에 노출됩니다.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          {socialFields.map(({ key, label, placeholder }) => (
            <div key={key} className="md:col-span-1">
              <Label htmlFor={`social.${key}`}>{label}</Label>
              <Input
                id={`social.${key}`}
                type="url"
                placeholder={placeholder}
                {...register(`social.${key}`)}
              />
              {errors.social?.[key] && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.social[key]?.message}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
