'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/hooks/useToast';
import { setupSchema, type SetupSchema } from '@/lib/admin/setup';
import { ContactStep } from './steps/ContactStep';
import { DomainStep } from './steps/DomainStep';
import { GeneralStep } from './steps/GeneralStep';
import { ReviewStep } from './steps/ReviewStep';
import { SocialStep } from './steps/SocialStep';
import { ThemeStep } from './steps/ThemeStep';

const steps = [
  { id: 'general', label: 'General' },
  { id: 'domain', label: 'Domain' },
  { id: 'contact', label: 'Contact' },
  { id: 'social', label: 'Social' },
  { id: 'theme', label: 'Theme' },
  { id: 'review', label: 'Review' },
];

const defaultValues: SetupSchema = {
  name: '',
  description: '',
  domain: '',
  contactEmail: '',
  contactPhone: '',
  social: {
    youtube: '',
    instagram: '',
    twitter: '',
    tiktok: '',
    facebook: '',
    soundcloud: '',
    spotify: '',
    threads: '',
  },
  theme: 'default',
};

const stepFields: Record<number, string[]> = {
  0: ['name', 'description'],
  1: ['domain'],
  2: ['contactEmail', 'contactPhone'],
  3: [
    'social.youtube',
    'social.instagram',
    'social.twitter',
    'social.tiktok',
    'social.facebook',
    'social.soundcloud',
    'social.spotify',
    'social.threads',
  ],
  4: ['theme'],
  5: [],
};

export function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const form = useForm<SetupSchema>({
    resolver: zodResolver(setupSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const validateStep = async () => {
    const fields = stepFields[currentStep];
    if (fields.length === 0) return true;
    return await form.trigger(fields as Array<keyof SetupSchema>);
  };

  const next = async () => {
    const valid = await validateStep();
    if (valid) {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    }
  };

  const prev = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const onSubmit = async (data: SetupSchema) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = (await response.json()) as { success?: boolean; message?: string; [key: string]: unknown };
      if (response.ok && result.success) {
        toast.addToast('Site configuration saved successfully.', 'success');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      } else {
        toast.addToast(
          result.message || 'Failed to save configuration.',
          'error'
        );
      }
    } catch {
      toast.addToast('An unexpected error occurred.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Setup steps" className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li key={step.id} className="flex flex-1 items-center">
              <div
                className={`flex flex-col items-center gap-2 ${
                  index <= currentStep ? 'text-amber-900' : 'text-stone-400'
                }`}
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full border text-sm font-semibold ${
                    index <= currentStep
                      ? 'border-amber-900 bg-amber-50'
                      : 'border-stone-300 bg-stone-100'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-xs font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 ${
                    index < currentStep ? 'bg-amber-900' : 'bg-stone-200'
                  }`}
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="min-h-[280px]">
            {currentStep === 0 && <GeneralStep form={form} />}
            {currentStep === 1 && <DomainStep form={form} />}
            {currentStep === 2 && <ContactStep form={form} />}
            {currentStep === 3 && <SocialStep form={form} />}
            {currentStep === 4 && <ThemeStep form={form} />}
            {currentStep === 5 && <ReviewStep form={form} />}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={prev}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={next}>
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting ? 'Saving...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
