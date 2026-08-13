import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { FeedbackChatPanel } from '@/components/features/feedback/FeedbackChatPanel'

export function FeedbackPage() {
  return (
    <DashboardLayout title="ご意見・不具合" fillViewport>
      <div className="flex min-h-0 flex-1 flex-col">
        <FeedbackChatPanel variant="page" />
      </div>
    </DashboardLayout>
  )
}
