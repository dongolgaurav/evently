import { Icon } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Icon name="progress_activity" className="animate-spin text-[28px] text-primary" />
    </div>
  );
}
