type AdminStatusBannerProps = {
  busy: boolean;
  message: string;
};

export function AdminStatusBanner({ busy, message }: AdminStatusBannerProps) {
  return <div className={`status-strip ${busy ? 'working' : 'ready'}`}>
    {busy ? 'Processing...' : message}
  </div>;
}

export default AdminStatusBanner;
