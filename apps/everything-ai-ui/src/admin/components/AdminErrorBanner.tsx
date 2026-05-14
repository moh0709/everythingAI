type AdminErrorBannerProps = {
  error: string;
};

export function AdminErrorBanner({ error }: AdminErrorBannerProps) {
  if (!error) return null;
  return <div className="error">{error}</div>;
}

export default AdminErrorBanner;
