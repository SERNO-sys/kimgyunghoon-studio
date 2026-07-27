import { SetupWizard } from '@/components/admin/setup/SetupWizard';

export default function AdminSetupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Setup Wizard
        </h1>
        <p className="mt-2 text-stone-600">
          Configure your site step by step.
        </p>
      </div>
      <SetupWizard />
    </div>
  );
}
