type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-6">
      {icon ? <div className="text-5xl mb-4 opacity-50">{icon}</div> : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="text-sm text-fg-muted mt-2 max-w-sm mx-auto">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
