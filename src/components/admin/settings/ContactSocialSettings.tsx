import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { SettingsFormData } from '@/lib/admin/settings';

interface ContactSocialSettingsProps {
  form: UseFormReturn<SettingsFormData>;
}

export function ContactSocialSettings({ form }: ContactSocialSettingsProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
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
      <div className="md:col-span-2">
        <Label htmlFor="contact.youtube">YouTube</Label>
        <Input
          id="contact.youtube"
          placeholder="https://youtube.com/..."
          {...register('contact.youtube')}
        />
        {errors.contact?.youtube && (
          <p className="mt-1 text-sm text-red-600">
            {errors.contact.youtube.message}
          </p>
        )}
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="contact.instagram">Instagram</Label>
        <Input
          id="contact.instagram"
          placeholder="https://instagram.com/..."
          {...register('contact.instagram')}
        />
        {errors.contact?.instagram && (
          <p className="mt-1 text-sm text-red-600">
            {errors.contact.instagram.message}
          </p>
        )}
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="contact.twitter">Twitter / X</Label>
        <Input
          id="contact.twitter"
          placeholder="https://x.com/..."
          {...register('contact.twitter')}
        />
        {errors.contact?.twitter && (
          <p className="mt-1 text-sm text-red-600">
            {errors.contact.twitter.message}
          </p>
        )}
      </div>
    </div>
  );
}
