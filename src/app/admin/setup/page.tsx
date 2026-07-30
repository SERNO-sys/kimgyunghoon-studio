import { SetupWizard } from '@/components/admin/setup/SetupWizard';

export default function AdminSetupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-semibold text-stone-950">
          Create your site
        </h1>
        <p className="mt-2 text-stone-600">
          사이트 이름, 설명, 도메인, 테마를 설정하고 관리자 대시보드로 들어가세요.
        </p>
      </div>
      <SetupWizard />
    </div>
  );
}
