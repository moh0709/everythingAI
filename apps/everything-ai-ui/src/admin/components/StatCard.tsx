type StatCardProps = {
  title: string;
  value: string | number;
};

export function StatCard({ title, value }: StatCardProps) {
  return <article className="stat">
    <span>{title}</span>
    <strong>{value}</strong>
  </article>;
}

export default StatCard;
